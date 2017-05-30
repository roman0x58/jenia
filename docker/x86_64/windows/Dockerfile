FROM mono:4.6.0.245

RUN apt-get update
RUN dpkg --add-architecture i386 && apt-get update
RUN apt-get install -fy wine-bin
RUN curl -sL https://deb.nodesource.com/setup_6.x | bash - && apt-get install -y nodejs
RUN npm install -g gulp-cli
