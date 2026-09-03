# Notices

This project is a modified version of [Docmost](https://github.com/docmost/docmost).
Docmost is Copyright (c) 2023-present Docmost, Inc. and its contributors.

The user-owned spaces changes are Copyright (c) 2026 the contributors to this
repository. Individual contributions remain copyrighted by their respective
authors.

Docmost core and the user-owned-spaces modifications are distributed under the
GNU Affero General Public License version 3. The complete license text remains
in [`LICENSE`](LICENSE).

Upstream files in `apps/server/src/ee`, `apps/client/src/ee`, and `packages/ee`
remain subject to the Docmost Enterprise License found in those directories.
This notice does not replace or alter any upstream license notice.

## Description of modifications

This derivative adds user-owned spaces to the Community Edition. An
authenticated workspace member can create multiple spaces, remain their
protected owner, and share them with other workspace members using Docmost's
existing space roles.

The changes are intentionally separate from Docmost's commercial personal-space
implementation. They use the `is_user_owned` database field and do not copy or
relicense Enterprise Edition code.

## Source availability

Every deployed build must set `SOURCE_CODE_URL` to the exact public tag or
commit containing the complete corresponding source for that build. The
application displays this link on every page, including public shares and
sign-in screens. Release images created by this repository set the URL and
revision automatically.
