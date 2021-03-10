FROM node:lts-alpine3.10
RUN mkdir -p ${output_dir}/node_modules && chown -R node:node ${output_dir}
WORKDIR ${output_dir}
USER node
COPY --chown=node:node . .
RUN npm install
CMD ["npm", "run", "smtp"]