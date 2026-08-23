/* =========================================================
   SVE NA DLANU
   POPULAR.JS - GA4

   AUTOMATSKO PRAVLJENJE popular.json

   VAŽNO:

   - posts.json se učitava DIREKTNO sa Cloudflare-a
   - NE TRAŽI lokalni posts.json
   - koriste se SAMO ID-jevi koji postoje u posts.json
   - EPIZODE SE NE PRIKAZUJU kao posebne stavke
   - ako GA4 URL pripada seriji, pregled se pripisuje seriji
   - ignorišu se stranice koje nisu serije
   - pravi:
       today
       last30Days
       allTime

   SVAKA LISTA:
       MAKSIMALNO 50 SERIJA

   FORMAT:

   {
       "today": [
           {
               "id": "ayse",
               "views": 1520
           }
       ],

       "last30Days": [
           {
               "id": "ayse",
               "views": 24580
           }
       ],

       "allTime": [
           {
               "id": "ayse",
               "views": 135240
           }
       ]
   }

========================================================= */

const fs = require("fs");
const path = require("path");
const https = require("https");

const {
    BetaAnalyticsDataClient
} = require("@google-analytics/data");

const {
    GoogleAuth
} = require("google-auth-library");


/* =========================================================
   PODESAVANJA
========================================================= */

const PROPERTY_ID = "549759235";

/*
 * BROJ SERIJA KOJE ŠALJEMO U SVAKU KATEGORIJU
 *
 * today       -> do 50
 * last30Days  -> do 50
 * allTime     -> do 50
 *
 * UKUPNO:
 * maksimalno 150 zapisa.
 */

const TOP_LIMIT = 50;

const POSTS_URL =
    "https://nadlanu.online/posts.json";

const OUTPUT_FILE =
    path.join(
        __dirname,
        "popular.json"
    );

const TIME_ZONE =
    "Europe/Belgrade";

const ALL_TIME_START_DATE =
    "2020-01-01";


/* =========================================================
   LOG
========================================================= */

function separator() {

    console.log(
        "=========================================="
    );

}


function section(title) {

    console.log("");

    separator();

    console.log(title);

    separator();

}


/* =========================================================
   MASK EMAIL
========================================================= */

function maskEmail(email) {

    if (!email) {

        return "(nema)";

    }

    const value =
        String(email);

    const parts =
        value.split("@");

    if (
        parts.length !== 2
    ) {

        return "***";

    }

    const name =
        parts[0];

    const domain =
        parts[1];

    if (
        name.length <= 2
    ) {

        return "***@" + domain;

    }

    return (
        name.substring(0, 2) +
        "***@" +
        domain
    );

}


/* =========================================================
   UCITAVANJE POSTS.JSON SA CLOUDFLARE-A
========================================================= */

function loadPostsFromCloudflare() {

    return new Promise(
        function(resolve, reject) {

            console.log("");

            console.log(
                "URL:"
            );

            console.log(
                POSTS_URL
            );


            https.get(
                POSTS_URL,
                function(response) {

                    let body = "";


                    response.setEncoding(
                        "utf8"
                    );


                    response.on(
                        "data",
                        function(chunk) {

                            body += chunk;

                        }
                    );


                    response.on(
                        "end",
                        function() {

                            console.log(
                                "HTTP status:",
                                response.statusCode
                            );


                            if (
                                response.statusCode !== 200
                            ) {

                                reject(
                                    new Error(
                                        "Cloudflare nije vratio HTTP 200. Status: " +
                                        response.statusCode
                                    )
                                );

                                return;

                            }


                            try {

                                const data =
                                    JSON.parse(
                                        body
                                    );


                                if (
                                    !Array.isArray(
                                        data
                                    )
                                ) {

                                    reject(
                                        new Error(
                                            "posts.json nije niz."
                                        )
                                    );

                                    return;

                                }


                                console.log(
                                    "✅ posts.json uspesno ucitan."
                                );


                                console.log(
                                    "Ukupno serija:",
                                    data.length
                                );


                                resolve(
                                    data
                                );


                            } catch (error) {

                                reject(
                                    new Error(
                                        "posts.json nije validan JSON: " +
                                        error.message
                                    )
                                );

                            }

                        }
                    );


                }
            ).on(
                "error",
                function(error) {

                    reject(
                        new Error(
                            "Greska pri povezivanju sa Cloudflare-om: " +
                            error.message
                        )
                    );

                }
            );

        }
    );

}


/* =========================================================
   KREIRAJ MAPU SERIJA
========================================================= */

function createSeriesMap(posts) {

    const seriesMap =
        new Map();


    posts.forEach(
        function(item) {

            if (
                !item ||
                typeof item !== "object"
            ) {

                return;

            }


            const id =
                String(
                    item.id || ""
                )
                .trim()
                .toLowerCase();


            if (!id) {

                return;

            }


            seriesMap.set(
                id,
                {

                    id:
                        id,

                    title:
                        String(
                            item.title || ""
                        )

                }
            );

        }
    );


    console.log("");

    console.log(
        "Kreirana lista dozvoljenih serija:"
    );

    console.log(
        seriesMap.size
    );


    return seriesMap;

}


/* =========================================================
   CREDENTIALS
========================================================= */

function getCredentials() {

    section(
        "1. GOOGLE SERVICE ACCOUNT"
    );


    const json =
        process.env.GOOGLE_SERVICE_ACCOUNT_JSON;


    if (!json) {

        throw new Error(
            "Nedostaje GOOGLE_SERVICE_ACCOUNT_JSON secret."
        );

    }


    console.log(
        "✅ GOOGLE_SERVICE_ACCOUNT_JSON postoji."
    );


    console.log(
        "Duzina:",
        json.length,
        "karaktera"
    );


    let credentials;


    try {

        credentials =
            JSON.parse(
                json
            );

    } catch (error) {

        throw new Error(
            "GOOGLE_SERVICE_ACCOUNT_JSON nije validan JSON."
        );

    }


    console.log(
        "✅ JSON je validan."
    );


    if (
        !credentials.client_email
    ) {

        throw new Error(
            "client_email ne postoji."
        );

    }


    if (
        !credentials.private_key
    ) {

        throw new Error(
            "private_key ne postoji."
        );

    }


    console.log(
        "client_email:",
        maskEmail(
            credentials.client_email
        )
    );


    console.log(
        "private_key postoji: DA"
    );


    const privateKey =
        String(
            credentials.private_key
        );


    if (
        !privateKey.includes(
            "BEGIN PRIVATE KEY"
        )
    ) {

        throw new Error(
            "private_key nema BEGIN PRIVATE KEY."
        );

    }


    if (
        !privateKey.includes(
            "END PRIVATE KEY"
        )
    ) {

        throw new Error(
            "private_key nema END PRIVATE KEY."
        );

    }


    console.log(
        "✅ Private key PEM format OK."
    );


    return credentials;

}


/* =========================================================
   GOOGLE AUTH
========================================================= */

function createGoogleAuth(
    credentials
) {

    section(
        "2. GOOGLE AUTH"
    );


    try {

        const auth =
            new GoogleAuth({

                credentials: {

                    client_email:
                        credentials.client_email,

                    private_key:
                        credentials.private_key

                },

                scopes: [

                    "https://www.googleapis.com/auth/analytics.readonly"

                ]

            });


        console.log(
            "✅ GoogleAuth napravljen."
        );


        return auth;


    } catch (error) {

        throw new Error(
            "GoogleAuth greska: " +
            error.message
        );

    }

}


/* =========================================================
   OAUTH TOKEN
========================================================= */

async function testGoogleAuthentication(
    auth
) {

    section(
        "3. GOOGLE OAUTH TOKEN"
    );


    try {

        const client =
            await auth.getClient();


        if (!client) {

            throw new Error(
                "Google Auth client nije napravljen."
            );

        }


        const tokenResponse =
            await client.getAccessToken();


        if (
            !tokenResponse ||
            !tokenResponse.token
        ) {

            throw new Error(
                "OAuth token nije dobijen."
            );

        }


        console.log(
            "✅ OAuth token uspesno dobijen."
        );


        return client;


    } catch (error) {

        console.error(
            "OAuth greska:",
            error.message
        );


        throw error;

    }

}


/* =========================================================
   GA4 CLIENT
========================================================= */

function createAnalyticsClient(
    credentials
) {

    section(
        "4. GA4 DATA API CLIENT"
    );


    try {

        const client =
            new BetaAnalyticsDataClient({

                credentials: {

                    client_email:
                        credentials.client_email,

                    private_key:
                        credentials.private_key

                }

            });


        console.log(
            "✅ GA4 client napravljen."
        );


        console.log(
            "Property:",
            PROPERTY_ID
        );


        return client;


    } catch (error) {

        throw new Error(
            "GA4 client greska: " +
            error.message
        );

    }

}


/* =========================================================
   TEST GA4 PROPERTY
========================================================= */

async function testGA4Property(
    analyticsDataClient
) {

    section(
        "5. PROVERA GA4 PROPERTY"
    );


    try {

        const [
            response
        ] =
            await analyticsDataClient.runReport({

                property:
                    `properties/${PROPERTY_ID}`,

                dateRanges: [

                    {

                        startDate:
                            "7daysAgo",

                        endDate:
                            "yesterday"

                    }

                ],

                dimensions: [

                    {
                        name:
                            "pagePathPlusQueryString"
                    }

                ],

                metrics: [

                    {
                        name:
                            "screenPageViews"
                    }

                ],

                limit:
                    1

            });


        console.log(
            "✅ GA4 Property pristup OK."
        );


        console.log(
            "Test redova:",
            (
                response.rows || []
            ).length
        );


        return true;


    } catch (error) {

        console.error(
            "❌ GA4 Property greska."
        );


        console.error(
            "Code:",
            error.code
        );


        console.error(
            "Message:",
            error.message
        );


        throw error;

    }

}


/* =========================================================
   NORMALIZUJ URL
========================================================= */

function normalizePath(
    pagePath
) {

    if (!pagePath) {

        return "";

    }


    let value =
        String(
            pagePath
        )
        .trim();


    try {

        if (
            value.startsWith(
                "http://"
            ) ||
            value.startsWith(
                "https://"
            )
        ) {

            const url =
                new URL(
                    value
                );


            value =
                url.pathname +
                url.search;

        }

    } catch (error) {

        // Nastavljamo normalno.

    }


    const hashIndex =
        value.indexOf("#");


    if (
        hashIndex !== -1
    ) {

        value =
            value.substring(
                0,
                hashIndex
            );

    }


    value =
        value.replace(
            /^\/+/,
            ""
        );


    return value;

}


/* =========================================================
   IZVADI ID IZ QUERY STRINGA
========================================================= */

function getIdFromQuery(
    value
) {

    try {

        const questionIndex =
            value.indexOf("?");


        if (
            questionIndex === -1
        ) {

            return "";

        }


        const query =
            value.substring(
                questionIndex + 1
            );


        const params =
            new URLSearchParams(
                query
            );


        const possibleKeys = [

            "id",
            "series",
            "seriesId",
            "slug",
            "post",
            "postId"

        ];


        for (
            const key
            of possibleKeys
        ) {

            const found =
                params.get(
                    key
                );


            if (found) {

                return String(
                    found
                )
                .trim()
                .toLowerCase();

            }

        }

    } catch (error) {

        return "";

    }


    return "";

}


/* =========================================================
   DA LI JE EPIZODA
========================================================= */

function looksLikeEpisode(
    value
) {

    const text =
        String(
            value || ""
        )
        .toLowerCase();


    const patterns = [

        /(^|\/)epizoda[-_ ]?\d+/i,

        /(^|\/)episode[-_ ]?\d+/i,

        /(^|\/)ep[-_ ]?\d+/i,

        /(^|\/)e[-_ ]?\d+/i,

        /(^|\/)season[-_ ]?\d+/i,

        /(^|\/)sezona[-_ ]?\d+/i,

        /(^|\/)s\d+e\d+/i

    ];


    for (
        const pattern
        of patterns
    ) {

        if (
            pattern.test(
                text
            )
        ) {

            return true;

        }

    }


    return false;

}


/* =========================================================
   PRONADJI SERIJU U GA4 PUTANJI
========================================================= */

function findSeriesId(
    pagePath,
    seriesMap
) {

    if (!pagePath) {

        return null;

    }


    const original =
        String(
            pagePath
        )
        .trim();


    if (!original) {

        return null;

    }


    /*
     * 1. QUERY PARAMETAR
     */

    const queryId =
        getIdFromQuery(
            original
        );


    if (
        queryId &&
        seriesMap.has(
            queryId
        )
    ) {

        return queryId;

    }


    /*
     * 2. NORMALIZOVANA PUTANJA
     */

    const normalized =
        normalizePath(
            original
        );


    if (!normalized) {

        return null;

    }


    /*
     * Ako URL izgleda kao epizoda,
     * ne tretiramo epizodu kao posebnu seriju.
     */

    if (
        looksLikeEpisode(
            normalized
        )
    ) {

        /*
         * I dalje pokušavamo pronaći ID serije
         * među segmentima.
         */

    }


    const pathOnly =
        normalized.split(
            "?"
        )[0];


    const segments =
        pathOnly
            .split("/")
            .filter(
                Boolean
            );


    if (!segments.length) {

        return null;

    }


    /*
     * 3. TAČNO POKLAPANJE SEGMENTA
     */

    for (
        const segment
        of segments
    ) {

        let cleanSegment =
            decodeURIComponent(
                segment
            )
            .trim()
            .toLowerCase();


        cleanSegment =
            cleanSegment
                .replace(
                    /\.html$/i,
                    ""
                );


        if (
            seriesMap.has(
                cleanSegment
            )
        ) {

            return cleanSegment;

        }

    }


    /*
     * 4. POSLEDNJI SEGMENT
     */

    let last =
        segments[
            segments.length - 1
        ];


    try {

        last =
            decodeURIComponent(
                last
            );

    } catch (error) {

        // Nastavljamo.

    }


    last =
        String(
            last
        )
        .trim()
        .toLowerCase()
        .replace(
            /\.html$/i,
            ""
        );


    if (
        seriesMap.has(
            last
        )
    ) {

        return last;

    }


    return null;

}


/* =========================================================
   GA4 PERIOD
========================================================= */

async function getPeriodData(

    analyticsDataClient,

    nazivPerioda,

    startDate,

    endDate,

    seriesMap

) {

    console.log("");

    console.log(
        "------------------------------------------"
    );

    console.log(
        nazivPerioda
    );

    console.log(
        "Period:",
        startDate,
        "→",
        endDate
    );

    console.log(
        "------------------------------------------"
    );


    try {

        const [
            response
        ] =
            await analyticsDataClient.runReport({

                property:
                    `properties/${PROPERTY_ID}`,

                dateRanges: [

                    {

                        startDate:
                            startDate,

                        endDate:
                            endDate

                    }

                ],

                dimensions: [

                    {
                        name:
                            "pagePathPlusQueryString"
                    }

                ],

                metrics: [

                    {
                        name:
                            "screenPageViews"
                    }

                ],

                orderBys: [

                    {

                        metric: {

                            metricName:
                                "screenPageViews",

                            order:
                                "DESCENDING"

                        }

                    }

                ],

                /*
                 * GA4 moze vratiti mnogo URL-ova.
                 * Uzima se dovoljno velik broj da
                 * ne izgubimo serije.
                 */

                limit:
                    100000

            });


        const rows =
            response.rows || [];


        console.log(
            "GA4 redova:",
            rows.length
        );


        const totals =
            new Map();


        let matchedRows =
            0;

        let ignoredRows =
            0;

        let totalViews =
            0;


        console.log("");

        console.log(
            "GA4 PAGE PATH PODACI:"
        );

        console.log(
            "------------------------------------------"
        );


        rows
            .slice(
                0,
                50
            )
            .forEach(
                function(row, index) {

                    const pagePath =
                        row
                            .dimensionValues?.[0]
                            ?.value || "";


                    const views =
                        Number(
                            row
                                .metricValues?.[0]
                                ?.value || 0
                        );


                    console.log(
                        `${index + 1}. ${pagePath} → ${views}`
                    );

                }
            );


        console.log(
            "------------------------------------------"
        );


        rows.forEach(
            function(row) {

                const pagePath =
                    row
                        .dimensionValues?.[0]
                        ?.value || "";


                const views =
                    Number(
                        row
                            .metricValues?.[0]
                            ?.value || 0
                    );


                if (
                    !pagePath ||
                    views <= 0
                ) {

                    ignoredRows++;

                    return;

                }


                totalViews +=
                    views;


                const seriesId =
                    findSeriesId(
                        pagePath,
                        seriesMap
                    );


                if (!seriesId) {

                    ignoredRows++;

                    return;

                }


                matchedRows++;


                const old =
                    totals.get(
                        seriesId
                    ) || 0;


                totals.set(
                    seriesId,
                    old + views
                );

            }
        );


        const result = [];


        totals.forEach(
            function(views, id) {

                if (
                    views <= 0
                ) {

                    return;

                }


                result.push({

                    id:
                        id,

                    views:
                        Number(
                            views
                        )

                });

            }
        );


        result.sort(
            function(a, b) {

                return (
                    Number(
                        b.views
                    )
                    -
                    Number(
                        a.views
                    )
                );

            }
        );


        console.log("");

        console.log(
            "REZULTAT PERIODA:"
        );

        console.log(
            "Ukupno GA4 pregleda:",
            totalViews
        );

        console.log(
            "Prepoznatih redova:",
            matchedRows
        );

        console.log(
            "Ignorisanih redova:",
            ignoredRows
        );

        console.log(
            "Pronadjenih serija:",
            result.length
        );


        console.log("");

        console.log(
            "TOP 50 PREPOZNATIH SERIJA:"
        );

        console.log(
            "------------------------------------------"
        );


        result
            .slice(
                0,
                TOP_LIMIT
            )
            .forEach(
                function(item, index) {

                    const series =
                        seriesMap.get(
                            item.id
                        );


                    const title =
                        series
                            ? series.title
                            : "";


                    console.log(
                        `${index + 1}. ${item.id} | ${title} | ${item.views} pregleda`
                    );

                }
            );


        console.log(
            "------------------------------------------"
        );


        return result;


    } catch (error) {

        console.error("");

        console.error(
            "❌ Greska perioda:",
            nazivPerioda
        );


        console.error(
            "Code:",
            error.code || "n/a"
        );


        console.error(
            "Message:",
            error.message || "n/a"
        );


        if (
            error.details
        ) {

            console.error(
                "Details:",
                error.details
            );

        }


        throw error;

    }

}


/* =========================================================
   TOP LISTA
========================================================= */

function getTop(
    data
) {

    if (
        !Array.isArray(
            data
        )
    ) {

        return [];

    }


    const copy =
        data.slice();


    copy.sort(
        function(a, b) {

            return (
                Number(
                    b.views || 0
                )
                -
                Number(
                    a.views || 0
                )
            );

        }
    );


    return copy.slice(
        0,
        TOP_LIMIT
    );

}


/* =========================================================
   PRINT TOP
========================================================= */

function printTop(
    title,
    data,
    seriesMap
) {

    console.log("");

    console.log(
        title
    );


    if (
        !Array.isArray(data) ||
        !data.length
    ) {

        console.log(
            "Nema podataka."
        );

        return;

    }


    data.forEach(
        function(item, index) {

            const series =
                seriesMap.get(
                    item.id
                );


            const titleText =
                series
                    ? series.title
                    : "";


            console.log(
                `${index + 1}. ${item.id} - ${titleText} - ${item.views} pregleda`
            );

        }
    );

}


/* =========================================================
   FORMAT JSON
========================================================= */

function formatList(
    data
) {

    if (
        !Array.isArray(
            data
        )
    ) {

        return [];

    }


    return data
        .slice(
            0,
            TOP_LIMIT
        )
        .map(
            function(item) {

                return {

                    id:
                        String(
                            item.id
                        ),

                    views:
                        Number(
                            item.views || 0
                        )

                };

            }
        );

}


/* =========================================================
   VALIDACIJA
========================================================= */

function validatePopularJSON(
    data,
    seriesMap
) {

    section(
        "9. VALIDACIJA popular.json"
    );


    if (
        !data ||
        typeof data !== "object"
    ) {

        throw new Error(
            "popular.json nije objekat."
        );

    }


    const categories = [

        "today",
        "last30Days",
        "allTime"

    ];


    categories.forEach(
        function(category) {

            if (
                !Array.isArray(
                    data[category]
                )
            ) {

                throw new Error(
                    `${category} nije validan niz.`
                );

            }


            /*
             * VAŽNO:
             *
             * OVDE VIŠE NEMA 10.
             *
             * Koristi se TOP_LIMIT = 50.
             */

            if (
                data[category].length >
                TOP_LIMIT
            ) {

                throw new Error(
                    `${category} ima vise od ${TOP_LIMIT} elemenata.`
                );

            }


            data[category].forEach(
                function(item) {

                    if (
                        !item ||
                        !item.id
                    ) {

                        throw new Error(
                            `${category} ima element bez id.`
                        );

                    }


                    if (
                        typeof item.views !==
                        "number"
                    ) {

                        throw new Error(
                            `${category} ${item.id} nema validan views.`
                        );

                    }


                    /*
                     * ID mora postojati u posts.json.
                     */

                    if (
                        !seriesMap.has(
                            String(
                                item.id
                            )
                            .trim()
                            .toLowerCase()
                        )
                    ) {

                        throw new Error(
                            `${category} sadrzi ID koji ne postoji u posts.json: ${item.id}`
                        );

                    }

                }
            );

        }
    );


    console.log(
        "✅ today:",
        data.today.length,
        "/",
        TOP_LIMIT
    );


    console.log(
        "✅ last30Days:",
        data.last30Days.length,
        "/",
        TOP_LIMIT
    );


    console.log(
        "✅ allTime:",
        data.allTime.length,
        "/",
        TOP_LIMIT
    );


    console.log(
        "✅ popular.json validan."
    );


    return true;

}


/* =========================================================
   NAPRAVI JSON
========================================================= */

function createPopularJSON(

    popularnoDanas,

    popularno30Dana,

    popularnoOduvek,

    seriesMap

) {

    section(
        "8. PRAVLJENJE popular.json"
    );


    const output = {

        today:
            formatList(
                popularnoDanas
            ),

        last30Days:
            formatList(
                popularno30Dana
            ),

        allTime:
            formatList(
                popularnoOduvek
            )

    };


    fs.writeFileSync(

        OUTPUT_FILE,

        JSON.stringify(
            output,
            null,
            4
        ),

        "utf8"

    );


    console.log(
        "✅ popular.json napravljen."
    );


    console.log(
        "Lokacija:",
        OUTPUT_FILE
    );


    printTop(
        "TOP 50 - TODAY",
        output.today,
        seriesMap
    );


    printTop(
        "TOP 50 - LAST 30 DAYS",
        output.last30Days,
        seriesMap
    );


    printTop(
        "TOP 50 - ALL TIME",
        output.allTime,
        seriesMap
    );


    validatePopularJSON(
        output,
        seriesMap
    );


    return output;

}


/* =========================================================
   GLAVNA FUNKCIJA
========================================================= */

async function createPopularJSONProcess() {

    section(
        "SVE NA DLANU - GA4 POPULARNO"
    );


    console.log(
        "Property:",
        PROPERTY_ID
    );


    console.log(
        "Top limit:",
        TOP_LIMIT
    );


    console.log(
        "Timezone:",
        TIME_ZONE
    );


    console.log(
        "Posts URL:",
        POSTS_URL
    );


    console.log("");

    console.log(
        "SVAKA KATEGORIJA MOZE IMATI DO",
        TOP_LIMIT,
        "SERIJA."
    );


    try {

        /* =================================================
           1. POSTS.JSON SA CLOUDFLARE-A
        ================================================= */

        section(
            "1. UCITAVANJE posts.json"
        );


        const posts =
            await loadPostsFromCloudflare();


        if (
            !posts.length
        ) {

            throw new Error(
                "posts.json je prazan."
            );

        }


        const seriesMap =
            createSeriesMap(
                posts
            );


        if (
            seriesMap.size === 0
        ) {

            throw new Error(
                "Nijedna validna serija nije pronadjena u posts.json."
            );

        }


        /* =================================================
           2. CREDENTIALS
        ================================================= */

        const credentials =
            getCredentials();


        /* =================================================
           3. AUTH
        ================================================= */

        const auth =
            createGoogleAuth(
                credentials
            );


        /* =================================================
           4. TOKEN
        ================================================= */

        await testGoogleAuthentication(
            auth
        );


        /* =================================================
           5. CLIENT
        ================================================= */

        const analyticsDataClient =
            createAnalyticsClient(
                credentials
            );


        /* =================================================
           6. PROPERTY
        ================================================= */

        await testGA4Property(
            analyticsDataClient
        );


        /* =================================================
           7A. TODAY
        ================================================= */

        section(
            "7A. TODAY"
        );


        const danas =
            await getPeriodData(

                analyticsDataClient,

                "Danas",

                "today",

                "today",

                seriesMap

            );


        /* =================================================
           7B. LAST 30 DAYS
        ================================================= */

        section(
            "7B. LAST 30 DAYS"
        );


        const poslednjih30 =
            await getPeriodData(

                analyticsDataClient,

                "Poslednjih 30 dana",

                "30daysAgo",

                "yesterday",

                seriesMap

            );


        /* =================================================
           7C. ALL TIME
        ================================================= */

        section(
            "7C. ALL TIME"
        );


        const oduvek =
            await getPeriodData(

                analyticsDataClient,

                "Sve vreme",

                ALL_TIME_START_DATE,

                "today",

                seriesMap

            );


        /* =================================================
           8. TOP 50
        ================================================= */

        section(
            "8. OBRADA TOP 50 LISTA"
        );


        const popularnoDanas =
            getTop(
                danas
            );


        const popularno30Dana =
            getTop(
                poslednjih30
            );


        const popularnoOduvek =
            getTop(
                oduvek
            );


        console.log(
            "TODAY:",
            popularnoDanas.length,
            "serija"
        );


        console.log(
            "LAST 30 DAYS:",
            popularno30Dana.length,
            "serija"
        );


        console.log(
            "ALL TIME:",
            popularnoOduvek.length,
            "serija"
        );


        /* =================================================
           9. JSON
        ================================================= */

        createPopularJSON(

            popularnoDanas,

            popularno30Dana,

            popularnoOduvek,

            seriesMap

        );


        /* =================================================
           SUCCESS
        ================================================= */

        section(
            "USPESNO ZAVRSENO"
        );


        console.log(
            "✅ Cloudflare posts.json"
        );


        console.log(
            "✅ Google Service Account"
        );


        console.log(
            "✅ Google Auth"
        );


        console.log(
            "✅ OAuth token"
        );


        console.log(
            "✅ GA4 Data API"
        );


        console.log(
            "✅ GA4 Property"
        );


        console.log(
            "✅ Today - TOP 50"
        );


        console.log(
            "✅ Last 30 Days - TOP 50"
        );


        console.log(
            "✅ All Time - TOP 50"
        );


        console.log(
            "✅ Samo serije iz posts.json"
        );


        console.log(
            "✅ Epizode nisu posebne stavke"
        );


        console.log(
            "✅ Duplikati spojeni"
        );


        console.log(
            "✅ Maksimalno 50 po kategoriji"
        );


        console.log(
            "✅ popular.json"
        );


        console.log("");

        console.log(
            "=========================================="
        );

        console.log(
            "SVE JE USPESNO ZAVRSENO"
        );

        console.log(
            "=========================================="
        );


    } catch (error) {

        section(
            "GRESKA"
        );


        console.error(
            "❌ popular.js NIJE USPESNO ZAVRSEN."
        );


        console.error(
            "Code:",
            error.code || "n/a"
        );


        console.error(
            "Message:",
            error.message || "n/a"
        );


        if (
            error.details
        ) {

            console.error(
                "Details:",
                error.details
            );

        }


        console.error("");

        console.error(
            "=========================================="
        );


        console.error(
            "POPULAR.JS PREKIDA RAD."
        );


        console.error(
            "=========================================="
        );


        process.exit(1);

    }

}


/* =========================================================
   START
========================================================= */

createPopularJSONProcess();
