# Design

Keep the existing ancestor walk and distinguish an empty `.git` directory
from checkout metadata. Continue the walk after an empty directory so it
cannot hide an enclosing checkout. Retain the conservative detection of
nonempty directories and other marker types, including worktree gitfiles.

Exercise the Composer CLI with an empty marker above the temporary working
directory, then verify that an empty marker nested inside a real checkout
still leads to refusal. Check the project adapter and temporary cleanup at
the CLI boundary.
