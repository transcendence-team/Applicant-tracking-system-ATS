FROM nginx:latest
RUN apt-get update && apt-get install -y openssl
RUN openssl req -x509 -nodes -days 365 -newkey rsa:2048 -keyout /etc/ssl/private/ats.key -out /etc/ssl/certs/ats.crt -subj "/C=MA/ST=Marrakesh/L=Ben Guerir/O=1337/CN=localhost"
COPY nginx.conf /etc/nginx/nginx.conf
CMD ["nginx", "-g", "daemon off;"]