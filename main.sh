#!/bin/bash

set -o errexit -o pipefail -o noclobber -o nounset

while [[ "$#" -gt 0 ]]; do
    case $1 in
        -s|--secrets) readonly _secrets="$2"; shift;
        -c|--certbot) readonly certbot=true;
        -d|--domain) readonly _domain="$2"; shift;
        *) echo "Unknown parameter passed: $1"; exit 1;
    esac
    shift
done

readonly secrets=${_secrets:"./.secrets"}
readonly domain=${_domain:"keine.shop"}

if [ "${certbot}" = true ] ; then
  ./certbot/main.sh --auto-renew \
  --secrets "${secrets}/certbot/cf.ini" \
  --domain #{domain}\
  --post-hook "docker restart"
fi