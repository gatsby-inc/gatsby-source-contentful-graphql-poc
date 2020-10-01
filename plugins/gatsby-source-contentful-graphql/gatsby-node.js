const {
  loadSchema,
  createDefaultQueryExecutor,
  readOrGenerateDefaultFragments,
  compileNodeQueries,
  buildNodeDefinitions,
  createSchemaCustomization,
  sourceAllNodes,
  writeCompiledQueries,
} = require(`gatsby-graphql-source-toolkit`);
require("dotenv").config();

async function createConfig(gatsbyApi) {
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
          blogPostCollection(limit: $limit, skip: $offset) {
            items { ..._BlogPostId_ ...BlogPostFragment }
          }
        }
        fragment _BlogPostId_ on BlogPost {
          __typename
          id: sys { id }
        }
        fragment BlogPostFragment on BlogPost {
          remoteId: sys {
            id
          }
          title
          slug
          heroImage {
            url
          }
          body
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

  await writeCompiledQueries("./sourcing-queries", documents);

  return {
    gatsbyApi,
    schema,
    execute: ({ operationName, query, variables = {} }) => {
      console.log(
        `
      
        Executing query ${operationName}!
      
      
      `,
        query,
        variables
      );

      return execute({ operationName, query, variables });
    },
    gatsbyTypePrefix: `Contentful`,
    gatsbyNodeDefs: buildNodeDefinitions({ gatsbyNodeTypes, documents }),
  };
}

exports.sourceNodes = async (gatsbyApi) => {
  const config = await createConfig(gatsbyApi);

  await createSchemaCustomization(config);

  await sourceAllNodes(config);
};
