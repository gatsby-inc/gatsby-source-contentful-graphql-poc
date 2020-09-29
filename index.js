const {
  loadSchema,
  createDefaultQueryExecutor,
} = require(`gatsby-graphql-source-toolkit`);
require("dotenv").config();

async function test() {
  const spaceId = process.env.SPACE_ID;
  const cdaToken = process.env.CDA_TOKEN;
  const schemaUrl = `https://graphql.contentful.com/content/v1/spaces/${spaceId}?access_token=${cdaToken}`;

  const execute = createDefaultQueryExecutor(schemaUrl);
  const schema = await loadSchema(execute);

  console.log(schema);
}

test();
