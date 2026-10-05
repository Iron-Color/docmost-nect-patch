import { BadRequestException } from '@nestjs/common';
import { SpaceController } from './space.controller';
import { SpaceMemberService } from './services/space-member.service';
import { SpaceRole } from '../../common/helpers/types/permission';

describe('user-owned spaces', () => {
  it('lets an authenticated workspace member create a personal space', async () => {
    const createSpace = jest.fn().mockResolvedValue({ id: 'space-1' });
    const controller = new SpaceController(
      { createSpace } as any,
      {} as any,
      {} as any,
      {} as any,
      {} as any,
    );
    const user = { id: 'user-1', role: 'member' } as any;
    const workspace = { id: 'workspace-1' } as any;
    const dto = { name: 'Notes', slug: 'notes' };

    await controller.createPersonalSpace(dto, user, workspace);

    expect(createSpace).toHaveBeenCalledWith(
      user,
      workspace.id,
      dto,
      undefined,
      { isUserOwned: true },
    );
  });

  it('does not allow the creator to be removed from a personal space', async () => {
    const service = createSpaceMemberService({
      id: 'space-1',
      creatorId: 'owner-1',
      isUserOwned: true,
    });

    await expect(
      service.removeMemberFromSpace(
        { spaceId: 'space-1', userId: 'owner-1', groupId: undefined },
        'workspace-1',
      ),
    ).rejects.toThrow(
      new BadRequestException(
        'The owner of a personal space cannot be removed',
      ),
    );
  });

  it('does not allow the creator to lose full access', async () => {
    const service = createSpaceMemberService({
      id: 'space-1',
      creatorId: 'owner-1',
      isUserOwned: true,
    });

    await expect(
      service.updateSpaceMemberRole(
        {
          spaceId: 'space-1',
          userId: 'owner-1',
          groupId: undefined,
          role: SpaceRole.WRITER,
        },
        'workspace-1',
      ),
    ).rejects.toThrow(
      new BadRequestException(
        'The owner of a personal space must keep full access',
      ),
    );
  });

  it('checks ownership inside the locked transaction before deleting', async () => {
    const { service, repos, trx } = setupMembership();
    await expect(
      service.removeMemberFromSpace(
        { spaceId: 'space-1', groupId: undefined, userId: 'owner-1' },
        'workspace-1',
      ),
    ).rejects.toThrow('The owner of a personal space cannot be removed');
    expect(repos.space.findById).toHaveBeenCalledWith(
      'space-1',
      'workspace-1',
      { withLock: true, trx },
    );
    expect(repos.member.getSpaceMemberByTypeId).toHaveBeenCalledWith(
      'space-1',
      { userId: 'owner-1' },
      trx,
    );
    expect(repos.member.removeSpaceMemberById).not.toHaveBeenCalled();
  });

  it('keeps owner protection even when another admin exists', async () => {
    const { service, repos } = setupMembership();
    await expect(
      service.updateSpaceMemberRole(
        {
          spaceId: 'space-1',
          groupId: undefined,
          userId: 'owner-1',
          role: SpaceRole.WRITER,
        },
        'workspace-1',
      ),
    ).rejects.toThrow('The owner of a personal space must keep full access');
    expect(repos.member.updateSpaceMember).not.toHaveBeenCalled();
  });

  it('allows removing a different member and keeps cleanup in the transaction', async () => {
    const { service, repos, trx } = setupMembership();
    await service.removeMemberFromSpace(
      { spaceId: 'space-1', groupId: undefined, userId: 'other-1' },
      'workspace-1',
    );
    expect(repos.member.roleCountBySpaceId).toHaveBeenCalledWith(
      SpaceRole.ADMIN,
      'space-1',
      trx,
    );
    expect(repos.member.removeSpaceMemberById).toHaveBeenCalledWith(
      'membership-1',
      'space-1',
      { trx },
    );
    expect(repos.watcher.deleteByUsersWithoutSpaceAccess).toHaveBeenCalledWith(
      ['other-1'],
      'space-1',
      { trx },
    );
    expect(repos.favorite.deleteByUsersWithoutSpaceAccess).toHaveBeenCalledWith(
      ['other-1'],
      'space-1',
      { trx },
    );
  });

  it('allows removing an admin group when another admin remains', async () => {
    const { service, repos, trx } = setupMembership();
    await service.removeMemberFromSpace(
      { spaceId: 'space-1', groupId: 'group-1', userId: undefined },
      'workspace-1',
    );
    expect(repos.member.getSpaceMemberByTypeId).toHaveBeenCalledWith(
      'space-1',
      { groupId: 'group-1' },
      trx,
    );
    expect(repos.watcher.deleteByUsersWithoutSpaceAccess).toHaveBeenCalledWith(
      ['group-user'],
      'space-1',
      { trx },
    );
  });

  it.each([0, 1])(
    'prevents deleting or demoting the last admin (count %i)',
    async (count) => {
      const { service, repos } = setupMembership({ isUserOwned: false });
      repos.member.roleCountBySpaceId.mockResolvedValue(count);
      await expect(
        service.removeMemberFromSpace(
          { spaceId: 'space-1', groupId: undefined, userId: 'other-1' },
          'workspace-1',
        ),
      ).rejects.toThrow('There must be at least one space admin');
      await expect(
        service.updateSpaceMemberRole(
          {
            spaceId: 'space-1',
            groupId: undefined,
            userId: 'other-1',
            role: SpaceRole.WRITER,
          },
          'workspace-1',
        ),
      ).rejects.toThrow('There must be at least one space admin');
      expect(repos.member.removeSpaceMemberById).not.toHaveBeenCalled();
      expect(repos.member.updateSpaceMember).not.toHaveBeenCalled();
    },
  );

  it('allows another admin to be demoted using the same transaction', async () => {
    const { service, repos, trx } = setupMembership();
    await service.updateSpaceMemberRole(
      {
        spaceId: 'space-1',
        groupId: undefined,
        userId: 'other-1',
        role: SpaceRole.WRITER,
      },
      'workspace-1',
    );
    expect(repos.member.updateSpaceMember).toHaveBeenCalledWith(
      { role: SpaceRole.WRITER },
      'membership-1',
      'space-1',
      trx,
    );
  });

  it('does not update or log when the owner retains the admin role', async () => {
    const { service, repos } = setupMembership();
    await service.updateSpaceMemberRole(
      {
        spaceId: 'space-1',
        groupId: undefined,
        userId: 'owner-1',
        role: SpaceRole.ADMIN,
      },
      'workspace-1',
    );
    expect(repos.member.updateSpaceMember).not.toHaveBeenCalled();
    expect(repos.audit.log).not.toHaveBeenCalled();
  });
});

function createSpaceMemberService(space: Record<string, unknown>) {
  return setupMembership(space).service;
}

function setupMembership(space: Record<string, unknown> = {}) {
  const trx = {};
  const member = {
    getSpaceMemberByTypeId: jest.fn().mockResolvedValue({
      id: 'membership-1',
      userId: 'owner-1',
      role: SpaceRole.ADMIN,
    }),
    roleCountBySpaceId: jest.fn().mockResolvedValue(2),
    removeSpaceMemberById: jest.fn().mockResolvedValue(undefined),
    updateSpaceMember: jest.fn().mockResolvedValue(undefined),
  };
  const repos = {
    member,
    space: {
      findById: jest
        .fn()
        .mockResolvedValue({
          id: 'space-1',
          creatorId: 'owner-1',
          isUserOwned: true,
          ...space,
        }),
    },
    group: { getUserIdsByGroupId: jest.fn().mockResolvedValue(['group-user']) },
    watcher: {
      deleteByUsersWithoutSpaceAccess: jest.fn().mockResolvedValue(undefined),
    },
    favorite: {
      deleteByUsersWithoutSpaceAccess: jest.fn().mockResolvedValue(undefined),
    },
    audit: { log: jest.fn() },
  };

  const service = new SpaceMemberService(
    repos.member as any,
    repos.group as any,
    repos.space as any,
    repos.watcher as any,
    repos.favorite as any,
    {
      transaction: () => ({
        execute: (callback: (t: unknown) => unknown) => callback(trx),
      }),
    } as any,
    repos.audit as any,
  );
  return { service, repos, trx };
}
