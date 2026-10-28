#!/bin/zsh
# Builds the release app and uploads it to App Store Connect for TestFlight (Eventings team).
# Needs: the app record in App Store Connect (bundle id de.rangerjones.derGrosseJakob) and the
# Eventings Apple account signed in to Xcode (Settings → Accounts).
# Every upload needs a new build number; it is taken from the clock (YYMMDDHHMM).
set -e
cd ${0:A:h:h}
flutter build ipa --release --build-number=$(date +%y%m%d%H%M) --export-options-plist=ios/ExportOptions-TestFlight.plist "$@"
echo "Hochgeladen. Nach der Verarbeitung (ca. 10–30 Min.) erscheint der Build in App Store Connect unter TestFlight."
