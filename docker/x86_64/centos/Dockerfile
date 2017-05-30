FROM centos

RUN yum install -y curl rpm-build
RUN curl --silent --location https://rpm.nodesource.com/setup_7.x | bash -
RUN yum -y install nodejs
RUN npm install -g gulp-cli