# Verification

The published v0.5.0 command rejected a temporary path under an empty `.git`
directory. An isolated profile using Codex CLI `0.166.0-alpha.6` installed from
the same locked release with a temporary path outside that marker. With the
source fix it installed and reused the plugin under the marker, enabled the
project profile, and removed the temporary working directory. Git supplied the
locked tag from a local mirror for this rehearsal.

The focused Node suite passed all six setup tests. It covered subprocess
directory selection and cleanup, and confirmed that an empty nested marker
cannot hide a real checkout with a gitfile. The full local gate on the settled
implementation passed 116 Node tests, 12 PHP tests, Pint, PHPStan and strict
documentation and OpenSpec validation. Independent review had no findings.
