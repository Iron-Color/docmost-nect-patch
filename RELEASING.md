# Releasing

Release tags and container images must identify the same Git commit.

1. Merge the tested changes into the release branch.
2. Create an annotated tag such as `v0.95.0-nect.1` on that commit. The
   `nect` suffix identifies this fork; feature names are not used in versions.
3. Push the tag to GitHub.
4. Wait for the Release workflow to publish the matching image to GitHub
   Container Registry and create the GitHub release.
5. Deploy the immutable SHA digest printed by the workflow, rather than a
   mutable tag.

The workflow checks out the pushed tag, resolves its exact commit, labels the
image with that commit SHA, and sets `SOURCE_CODE_URL` to the matching GitHub
tree. GitHub's source archives attached to the release therefore correspond to
the image source.

Do not publish a release from an uncommitted worktree or manually move an
existing release tag.
