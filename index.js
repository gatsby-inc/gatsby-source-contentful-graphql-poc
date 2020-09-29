const {
  loadSchema,
  createDefaultQueryExecutor,
  readOrGenerateDefaultFragments,
  compileNodeQueries,
} = require(`gatsby-graphql-source-toolkit`);
require("dotenv").config();

async function test() {
  const spaceId = process.env.SPACE_ID;
  const cdaToken = process.env.CDA_TOKEN;
  const schemaUrl = `https://graphql.contentful.com/content/v1/spaces/${spaceId}?access_token=${cdaToken}`;

  const execute = createDefaultQueryExecutor(schemaUrl);
  const schema = await loadSchema(execute);

  console.log(schema);

  const gatsbyNodeTypes = [
    {
      remoteTypeName: `BlogPost`,
      queries: `
        query LIST_BLOG_POSTS($limit: Int, $offset: Int) {
          blogPostsCollection(limit: $limit, skip: $offset) {
            remoteTypeName: __typename
            ..._BlogPostId_
          }
        }

        fragment _BlogPostId_ on BlogPost {
          __typename
          id
        }
      `,
    },
  ];

  const fragments = await readOrGenerateDefaultFragments(`./`, {
    schema,
    gatsbyNodeTypes,
  });

  const documents = compileNodeQueries({
    schema,
    gatsbyNodeTypes,
    customFragments: fragments,
  });

  console.log(documents);
}

test();
