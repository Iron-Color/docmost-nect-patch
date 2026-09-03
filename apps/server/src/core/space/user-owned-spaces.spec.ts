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
      new BadRequestException('The owner of a personal space cannot be removed'),
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
});

function createSpaceMemberService(space: Record<string, unknown>) {
  const spaceMemberRepo = {
    getSpaceMemberByTypeId: jest.fn().mockResolvedValue({
      id: 'membership-1',
      userId: 'owner-1',
      role: SpaceRole.ADMIN,
    }),
  };
  const spaceRepo = { findById: jest.fn().mockResolvedValue(space) };

  return new SpaceMemberService(
    spaceMemberRepo as any,
    {} as any,
    spaceRepo as any,
    {} as any,
    {} as any,
    {} as any,
    { log: jest.fn() } as any,
  );
}
