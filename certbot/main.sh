#!/bin/bash

while [[ "$#" -gt 0 ]]; do
    case $1 in
        -s|--secrets) readonly secrets="$2"; shift;
        -d|--domain) readonly domain="$2"; shift;
        -c|-a|--auto-renew|--cron) readonly cron=true;
        --post-hook) readonly post-hook="$2"; shift;
        *) echo "Unknown parameter passed: $1"; exit 1;
    esac
    shift
done

docker run -i -t --rm --name certbot \
    -v "/etc/letsencrypt:/etc/letsencrypt" \
    -v "/var/lib/letsencrypt:/var/lib/letsencrypt" \
    certbot/dns-cloudflare certonly \
    --dns-cloudflare \
    --dns-cloudflare-credentials ${secrets} \
    -d ${domain}

eval post-hook

if [ cron = true ] then
  # cron
  readonly crontab-name=renew-cron

  # sh
  cat >/etc/cron.d/${crontab-name}.sh <<'EOF'
    docker run -i -t --rm --name certbot \
      -v "/etc/letsencrypt:/etc/letsencrypt" \
      -v "/var/lib/letsencrypt:/var/lib/letsencrypt" \
      certbot/dns-cloudflare certonly \
      --dns-cloudflare \
EOF
  echo "--dns-cloudflare-credentials ${secrets} -d ${domain} renew" \
    >>/etc/cron.d/${crontab-name}.sh

  # cron file
  cat >/etc/cron.d/${crontab-name} <<EOF
    @monthly /etc/cron.d/${crontab-name}.sh --post-hook "${post-hook}"
    # An empty line is required at the end of this file for a valid cron file.
EOF

  # execute
  chmod 0644 /etc/cron.d/${crontab-name}
  chmod 0644 /etc/cron.d/${crontab-name}.sh
  crontab /etc/cron.d/${crontab-name}

  # log
  touch /var/log/cron.log && cron && tail -f /var/log/cron.log

fi