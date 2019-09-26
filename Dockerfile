FROM mhart/alpine-node:base

WORKDIR /src
ADD . .
ENTRYPOINT ["node", "_dockerstart.js"]

CMD ["{}"]