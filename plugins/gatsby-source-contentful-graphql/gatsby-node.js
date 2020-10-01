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

const PaginateContentful = {
  name: "LimitOffsetContenful",
  expectedVariableNames: [`limit`, `offset`],
  start() {
    return {
      variables: { limit: 20, offset: 0 },
      hasNextPage: true,
    };
  },
  next(state, page) {
    const limit = Number(state.variables.limit) || 100;
    const offset = Number(state.variables.offset) + limit;
    return {
      variables: { limit, offset },
      hasNextPage: page.items.length === limit,
    };
  },
  concat(result, page) {
    return result.items.concat(page);
  },
  getItems(pageOrResult) {
    return pageOrResult.items;
  },
};

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
            items { ..._BlogPostId_ }
          }
        }
        fragment _BlogPostId_ on BlogPost {
          __typename
          sys { id }
        }
      `,
    },
    {
      remoteTypeName: `Asset`,
      queries: `
        query LIST_ASSETS($limit: Int, $offset: Int) {
          assetCollection(limit: $limit, skip: $offset) {
            items { ..._AssetId_ }
          }
        }
        fragment _AssetId_ on Asset {
          __typename
          sys { id }
        }
      `,
    },
    {
      remoteTypeName: `Person`,
      queries: `
        query LIST_PERSONS($limit: Int, $offset: Int) {
          personCollection(limit: $limit, skip: $offset) {
            items { ..._PersonId_ }
          }
        }
        fragment _PersonId_ on Person {
          __typename
          sys { id }
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
    paginationAdapters: [PaginateContentful],
  };
}

exports.sourceNodes = async (gatsbyApi) => {
  const config = await createConfig(gatsbyApi);

  await createSchemaCustomization(config);

  await sourceAllNodes(config);
};
