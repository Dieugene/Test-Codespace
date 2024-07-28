const { Telegraf } = require('telegraf');
const moex = require('./moex.js');
const openai = require('./openai.js');
const retriever = require('./retriever.js');
const voicer = require("@dieugene/voicer")(process.env.VOICER_API_KEY);
//AQVNzPro3qflUR9tRI2Y7Q80jt0rzzZCzOWY541y
const bot = new Telegraf(process.env.BOT_TOKEN);

bot.start((ctx) => ctx.replyWithHTML(dict.start));
bot.help((ctx) => ctx.replyWithHTML(dict.help));

bot.on('text', async (ctx) => {
    //cutCtx(ctx);
    console.log('GOT TEXT CTX :: ', JSON.stringify(ctx));
    console.log('GOT TEXT :: ', ctx.message.text);
    let response = await processMoexRequest(ctx.message.text);
    //let response = await retriever.ask(ctx.message.text);
    await ctx.reply(response);
});
bot.command('test', async ctx => ctx.reply('Работает'));
bot.on('channel_post', async (ctx) => {
    //cutCtx(ctx);
    console.log('GOT CHANNEL POST CTX :: ', JSON.stringify(ctx));
});
bot.on('my_chat_member', async (ctx) => {
    //cutCtx(ctx);
    console.log('GOT CHAT MEMBER CTX :: ', JSON.stringify(ctx));
});
bot.on('voice', async (ctx) => {
    //cutCtx(ctx);
    console.log('GOT VOICE CTX :: ', JSON.stringify(ctx));
    ctx.reply("Распознаём...");
    await voicer.recognize(ctx, async function (text) {
        let response = await processMoexRequest(text);
        await ctx.reply(response);
    });
});

function cutCtx(ctx) {
    ctx.telegram.options.agent._sessionCache = null
}

module.exports.handler = async function (event, context) {
    console.log('EVENT.BODY :: ', event.body);
    const message = JSON.parse(event.body);
    try {
        await bot.handleUpdate(message);
    } catch (e) {
        console.log("ERROR :: ", e.message);
        console.log('ERROR :: STACK :: ', e?.stack);
    }

    return {
        statusCode: 200,
        body: '',
    };
};

async function ask_retriever({request = ''}) {
    return await retriever.ask(request)
}

async function processMoexRequest(text) {
    openai.f.add(
        openai.f.func(
            'get_stock_share_quotes_by_date',
            `Используется для получения данных по котировкам акций заданной компании на определенную дату. Возвращает объект со следующими ключами:
- "open" - цена открытия,
- "close" - цена закрытия,
- "high" - максимальная цена,
- "low" - минимиальная цена
Если данных нет, возвращает строку "Нет данных".`,
            [
                openai.f.param('company_name', 'string', 'Название компании (на русском языке), по которой узнаем котировки'),
                openai.f.param('date', 'string', 'Дата, на конец которой определяются котировки, в виде строки формата YYYY-MM-DD. Значение по умолчанию - текущая дата.')
            ],
            ['company_name']
        ),
        moex.get_stock_share_quotes_by_date
    );

    openai.f.add(
        openai.f.func(
            'get_stock_share_quotes_dynamics_by_period',
            `Используется для получения данных по котировкам акций заданной компании за период, определенный датой начала и датой окончания периода. Возвращает объект со следующими ключами:
- "from" - дата начала периода, в котором определяются котировки, в виде строки формата YYYY-MM-DD;
- "till" - дата окончания периода, в виде строки формата YYYY-MM-DD;
- "open" - цена открытия - на начало периода;
- "close" - цена закрытия - на конец периода;
- "high" - максимальная цена за период;
- "low" - минимиальная цена за период.
Если данных нет, возвращает строку "Нет данных". 
При выдаче ответа нужно указывать даты начала и окончания периода.`,
            [
                openai.f.param('company_name', 'string', 'Название компании (на русском языке), по которой узнаем котировки'),
                openai.f.param('from', 'string', 'Дата начала периода, в виде строки формата YYYY-MM-DD'),
                openai.f.param('till', 'string', 'Дата окончания периода, в виде строки формата YYYY-MM-DD')
            ],
            ['company_name']),
        moex.get_stock_share_quotes_dynamics_by_period
    );

    openai.f.add(
        openai.f.func(
            'ask_retriever',
            `Используется для получения информации о продуктах семейства Datashop, таких как: 
Инвесторо Про, Ценовой центр, Центр корпоративной информации, AlgoPack, Compliance Tool, Market Dive, Market Vision, Moex Data, Pro Pack.
Возвращает текст с ответом на вопрос пользователя с помощью технологии Retrieval Augmented Generation`,
            [
                openai.f.param('request', 'string', 'Вопрос или запрос пользователя ')
            ],
            ['request']
        ),
        ask_retriever
    );

    console.log('PROCESSING MOEX REQUEST :: ', text);
    let result = await openai.call({
            userPrompt: text,
            systemPrompt: openai.f.prompts.askForParams,
            model: 'gpt-4o',
            max_tokens: 4096
        });
    return result;
}

let f = (function () {
        function esc(str = "", skipEscape = false) {
            return skipEscape ? str : str.replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll("&", "&amp;");
        }

        return {
            bold: (str, skipEscape) => `<b>${esc(str, skipEscape)}</b>`,
            italic: (str, skipEscape) => `<i>${esc(str, skipEscape)}</i>`,
            underline: (str, skipEscape) => `<u>${esc(str, skipEscape)}</u>`,
            strikethrough: (str, skipEscape) => `<s>${esc(str, skipEscape)}</s>`,
            spoiler: (str, skipEscape) => `<span class="tg-spoiler">${esc(str, skipEscape)}</span>`,
            url: (str, url, skipEscape) => `<a href="${url}">${esc(str, skipEscape)}</a>`,
            code: (str, skipEscape) => `<code>${esc(str, skipEscape)}</code>`,
            codeblock: (str, skipEscape) => `<pre>${esc(str, skipEscape)}</pre>`,
            quote: (str, skipEscape) => `<blockquote>${esc(str, skipEscape)}</blockquote>`,
        }
    })(),
    dict = {
        start: `Я предоставляю актуальную информацию с Московской биржи, упрощая пользователю доступ к важным финансовым данным. Вот основные данные, которые я предоставляю:

1. ${f.bold(f.underline('Актуальные котировки акций:'), true)} Получите последние данные по акциям компаний, торгуемых на Московской бирже.
2. ${f.bold(f.underline('Исторические данные:'), true)} Запросите исторические данные о ценах акций для анализа трендов и стратегического планирования.

В скором времени я смогу предоставлять:
3. Индексы и изменения на рынке
4. Облигации и процентные ставки
5. Аналитика и прогнозы
6. Уведомления и оповещения
7. Личный финансовый помощник

Я готов стать полезным инструментом для всех, кто интересуется финансами и инвестициями на Московской бирже.

/help`,
        help: `Вы можете направлять вопросы о текущих котировках по тем или иным акциям, котируемых на Московской бирже, в виде текстовых или голосовых сообщений.

В настоящее время бот отрабатывает вопросы в ключе:
- данные о стоимости акций на заданную дату,
- данные о динамике стоимости акций за период.

Бот понимает относительные даты, такие как "сегодня", "вчера", "на прошлой неделе" и т.д.
Примеры запросов:
${f.quote('Какая сегодня стоимость акций Московского кредитного банка?')}
${f.quote('Как менялась стоимость акций Алросы за последнюю неделю?')}

Данные для ответов на вопросы берутся из ${f.url('публичных сервисов', 'https://iss.moex.com/iss/reference/')} Московской биржи, а именно ${f.url('свечи указанного инструмента', 'https://iss.moex.com/iss/reference/155')} по дефолтной группе режимов.
`
    };
