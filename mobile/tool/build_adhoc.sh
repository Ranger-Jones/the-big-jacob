#!/bin/zsh
# Builds an ad hoc IPA for friends' iPhones (signed with the Eventings team, no App Store Connect).
# The friends' iPhones must be registered first: developer.apple.com → Certificates, IDs & Profiles → Devices.
# Result: mobile/build/ios/ipa/*.ipa – share it e.g. via diawi.com (link + QR code to install).
set -e
cd ${0:A:h:h}
flutter build ipa --release --export-options-plist=ios/ExportOptions-AdHoc.plist "$@"
ls -lh build/ios/ipa/*.ipa
