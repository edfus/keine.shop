prerequisites
```sh
set -e
sudo apt update \
  && sudo apt full-upgrade -y \
  && sudo apt autoremove \
  && apt-get autoclean -y

sudo apt-get install \
  apt-transport-https \
  ca-certificates \
  curl \
  gnupg \
  unzip \
  cron

# Add Docker’s official GPG key:
curl -fsSL https://download.docker.com/linux/ubuntu/gpg \
  | sudo gpg --dearmor -o /usr/share/keyrings/docker-archive-keyring.gpg

# Set up the stable repository
echo \
  "deb [arch=amd64 signed-by=/usr/share/keyrings/docker-archive-keyring.gpg] https://download.docker.com/linux/ubuntu \
  $(lsb_release -cs) stable" | sudo tee /etc/apt/sources.list.d/docker.list > /dev/null

# Install docker
sudo apt-get install docker-ce docker-ce-cli containerd.io

sudo groupadd docker
sudo usermod -aG docker $USER

# On Debian and Ubuntu, the Docker service is configured to start on boot by default.
sudo reboot
```

download & execute
```sh
set -e
readonly repo=down-twitter-likes
readonly url=https://github.com/edfus/${repo}/archive/master.zip
readonly output=./tmp.zip
curl -L --proxy http://127.0.0.1:7890 $url -o $output
unzip $output && rm -f $output
cd ${repo}-master
./main.sh --build
```