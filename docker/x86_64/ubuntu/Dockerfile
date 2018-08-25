FROM ubuntu

RUN apt-get update
RUN apt-get install -y curl fakeroot dpkg  gnupg
RUN curl -sL https://deb.nodesource.com/setup_10.x | bash - && apt-get install -y nodejs
RUN npm install -g gulp-cli