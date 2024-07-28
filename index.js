const {
    ChatPromptTemplate,
    MessagesPlaceholder,
  } = require("@langchain/core/prompts");
const { ChatOpenAI } = require('@langchain/openai');
const { UpstashRedisChatMessageHistory } = require("@langchain/community/stores/message/upstash_redis");

const prompt = ChatPromptTemplate.fromMessages([
    ["system", "You're an assistant who's good at {ability}"],
    new MessagesPlaceholder("history"),
    ["human", "{question}"],
  ]);

  const chain = prompt.pipe(
    new ChatOpenAI({
      apiKey: process.env.OPENAI_API_KEY,
      modelName: "gpt-4-1106-preview"        ,
      configuration: {basePath: process.env.PROXY_URL}
    })
  );
  const { RunnableWithMessageHistory } = require("@langchain/core/runnables");

  const chainWithHistory = new RunnableWithMessageHistory({
    runnable: chain,
    getMessageHistory: (sessionId) =>
      new UpstashRedisChatMessageHistory({
        sessionId,
        config: {
          url: process.env.UPSTASH_REDIS_REST_URL,
          token: process.env.UPSTASH_REDIS_REST_TOKEN,
        },
      }),
    inputMessagesKey: "question",
    historyMessagesKey: "history",
  });

  chainWithHistory.invoke(
    {
      ability: "math",
      question: "What does cosine mean?",
    },
    {
      configurable: {
        sessionId: "foobarbaz",
      },
    }
  ).then(async result => {
    console.log(result);
    const result2 = await chainWithHistory.invoke(
      {
        ability: "math",
        question: "What's its inverse?",
      },
      {
        configurable: {
          sessionId: "foobarbaz",
        },
      }
    );
    
    console.log(result2);
  });
  
  
  
  
 