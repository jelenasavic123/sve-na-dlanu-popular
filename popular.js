/* =========================================================
   SVE NA DLANU
   POPULAR.JS - GA4

   AUTOMATSKO PRAVLJENJE popular.json

   FORMAT KOJI GLAVNI SCRIPT OCEKUJE:

   {
       "today": {
           "items": [
               {
                   "id": "ayse",
                   "views": 1520
               }
           ]
       },

       "last30Days": {
           "items": [
               {
                   "id": "ayse",
                   "views": 24580
               }
           ]
       },

       "allTime": {
           "items": [
               {
                   "id": "ayse",
                   "views": 135240
               }
           ]
       }
   }

========================================================= */


const fs = require("fs");

const path = require("path");


const {
    BetaAnalyticsDataClient
} = require("@google-analytics/data");


const {
    GoogleAuth
} = require("google-auth-library");



/* =========================================================
   PODESAVANJA
========================================================= */


const PROPERTY_ID =
    "549759235";


const TOP_LIMIT =
    10;


const OUTPUT_FILE =
    path.join(
        __dirname,
        "popular.json"
    );


const TIME_ZONE =
    "Europe/Belgrade";


/*
 * GA4 ne mora imati podatke od ovog datuma.
 * Google ce vratiti samo ono sto postoji.
 */

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

    console.log(
        title
    );

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
        String(
            email
        );


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

        name.substring(
            0,
            2
        )

        +

        "***@"

        +

        domain

    );

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
   PROVERA PROPERTY
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
                            "pagePath"
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
                response.rows ||
                []
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
   PAGE PATH → ID
========================================================= */


function convertPageToId(
    pagePath
) {

    if (!pagePath) {

        return "";

    }


    let value =
        String(
            pagePath
        ).trim();


    /*
     * Ukloni domen ako se nekim slucajem pojavi
     */

    try {

        if (
            value.startsWith(
                "http://"
            )

            ||

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

        // Nije URL - nastavljamo normalno

    }


    /*
     * Ukloni pocetni /
     */

    value =
        value.replace(
            /^\/+/,
            ""
        );


    /*
     * Query string
     */

    const questionIndex =
        value.indexOf(
            "?"
        );


    if (
        questionIndex !== -1
    ) {

        const query =
            value.substring(
                questionIndex + 1
            );


        const params =
            new URLSearchParams(
                query
            );


        /*
         * Ako imamo ?id=ayse
         */

        const id =
            params.get(
                "id"
            );


        if (id) {

            return String(
                id
            ).trim();

        }


        value =
            value.substring(
                0,
                questionIndex
            );

    }


    /*
     * Ukloni hash
     */

    const hashIndex =
        value.indexOf(
            "#"
        );


    if (
        hashIndex !== -1
    ) {

        value =
            value.substring(
                0,
                hashIndex
            );

    }


    /*
     * Ukloni index.html
     */

    value =
        value.replace(
            /\/index\.html$/i,
            ""
        );


    /*
     * Ukloni .html
     */

    value =
        value.replace(
            /\.html$/i,
            ""
        );


    /*
     * Ako postoji:
     *
     * /series/moja-serija
     *
     * uzmi samo:
     *
     * moja-serija
     */

    const parts =
        value
            .split("/")
            .filter(
                Boolean
            );


    if (
        !parts.length
    ) {

        return "";

    }


    value =
        parts[
            parts.length - 1
        ];


    return String(
        value
    ).trim();

}



/* =========================================================
   DA LI JE VALIDNA SERIJA
========================================================= */


function isValidSeriesId(
    id
) {

    if (!id) {

        return false;

    }


    const value =
        String(
            id
        )
        .trim()
        .toLowerCase();


    if (!value) {

        return false;

    }


    /*
     * Pocetne stranice
     */

    const forbidden = [

        "index",
        "index.html",
        "series",
        "home",
        "search",
        "popular"

    ];


    if (
        forbidden.includes(
            value
        )
    ) {

        return false;

    }


    /*
     * Staticki fajlovi
     */

    const forbiddenExtensions = [

        ".css",
        ".js",
        ".png",
        ".jpg",
        ".jpeg",
        ".webp",
        ".gif",
        ".svg",
        ".ico",
        ".json",
        ".xml",
        ".txt",
        ".woff",
        ".woff2",
        ".ttf",
        ".mp4",
        ".m3u8"

    ];


    for (
        const extension
        of forbiddenExtensions
    ) {

        if (
            value.endsWith(
                extension
            )
        ) {

            return false;

        }

    }


    return true;

}



/* =========================================================
   UCITAJ GA4 PERIOD
========================================================= */


async function getPeriodData(

    analyticsDataClient,

    nazivPerioda,

    startDate,

    endDate

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
                            "pagePath"
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

                limit:
                    10000

            });


        const rows =
            response.rows ||
            [];


        console.log(
            "GA4 redova:",
            rows.length
        );


        const result =
            [];


        rows.forEach(

            function(row) {

                const pagePath =
                    row
                        .dimensionValues?.[0]
                        ?.value ||
                    "";


                const views =
                    Number(

                        row
                            .metricValues?.[0]
                            ?.value ||
                        0

                    );


                const id =
                    convertPageToId(
                        pagePath
                    );


                /*
                 * Ne dozvoljavamo da bilo koja
                 * stranica udje u popular.json.
                 */

                if (
                    !isValidSeriesId(
                        id
                    )
                ) {

                    return;

                }


                if (
                    views <= 0
                ) {

                    return;

                }


                result.push({

                    originalPath:
                        pagePath,

                    id:
                        id,

                    visits:
                        views

                });

            }

        );


        console.log(
            "Validnih serija:",
            result.length
        );


        return result;


    } catch (error) {

        console.error(
            "❌ Greska perioda:",
            nazivPerioda
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
   UKLANJANJE DUPLIKATA
========================================================= */


function removeDuplicates(
    data
) {

    const map =
        new Map();


    data.forEach(

        function(item) {

            const id =
                String(
                    item.id ||
                    ""
                ).trim();


            if (!id) {

                return;

            }


            const views =
                Number(
                    item.visits ||
                    0
                );


            if (
                views <= 0
            ) {

                return;

            }


            const old =
                map.get(
                    id
                );


            if (old) {

                old.visits +=
                    views;

            } else {

                map.set(

                    id,

                    {

                        id:
                            id,

                        visits:
                            views

                    }

                );

            }

        }

    );


    return Array.from(
        map.values()
    );

}



/* =========================================================
   TOP 10
========================================================= */


function getTop(
    data
) {

    const unique =
        removeDuplicates(
            data
        );


    unique.sort(

        function(a, b) {

            return (

                Number(
                    b.visits
                )

                -

                Number(
                    a.visits
                )

            );

        }

    );


    return unique.slice(
        0,
        TOP_LIMIT
    );

}



/* =========================================================
   PRINT TOP
========================================================= */


function printTop(

    title,

    data

) {

    console.log("");

    console.log(
        title
    );


    if (
        !data.length
    ) {

        console.log(
            "Nema podataka."
        );


        return;

    }


    data.forEach(

        function(item, index) {

            console.log(

                `${index + 1}. ${item.id} - ${item.visits} pregleda`

            );

        }

    );

}



/* =========================================================
   FORMAT
========================================================= */


function formatList(
    data
) {

    return data.map(

        function(item) {

            return {

                id:
                    item.id,

                views:
                    Number(
                        item.visits ||
                        0
                    )

            };

        }

    );

}



/* =========================================================
   VALIDACIJA NOVOG FORMATA
========================================================= */


function validatePopularJSON(
    data
) {

    section(
        "9. VALIDACIJA popular.json"
    );


    if (!data) {

        throw new Error(
            "popular.json je prazan."
        );

    }


    const categories = [

        "today",
        "last30Days",
        "allTime"

    ];


    categories.forEach(

        function(category) {

            /*
             * Kategorija mora postojati
             */

            if (
                !data[category] ||
                typeof data[category] !==
                "object"
            ) {

                throw new Error(
                    `${category} nije objekat.`
                );

            }


            /*
             * items mora postojati
             */

            if (
                !Array.isArray(
                    data[category].items
                )
            ) {

                throw new Error(
                    `${category}.items nije niz.`
                );

            }


            const items =
                data[category].items;


            /*
             * TOP LIMIT
             */

            if (
                items.length >
                TOP_LIMIT
            ) {

                throw new Error(
                    `${category}.items ima vise od ${TOP_LIMIT} elemenata.`
                );

            }


            /*
             * Provera svakog elementa
             */

            items.forEach(

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


                    if (
                        !Number.isFinite(
                            item.views
                        )
                    ) {

                        throw new Error(
                            `${category} ${item.id} ima nevalidan broj views.`
                        );

                    }


                    if (
                        item.views < 0
                    ) {

                        throw new Error(
                            `${category} ${item.id} ima negativan views.`
                        );

                    }

                }

            );

        }

    );


    console.log(
        "✅ today:",
        data.today.items.length
    );


    console.log(
        "✅ last30Days:",
        data.last30Days.items.length
    );


    console.log(
        "✅ allTime:",
        data.allTime.items.length
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

    popularOduvek,

    popular30Dana,

    popularDanas

) {

    section(
        "8. PRAVLJENJE popular.json"
    );


    /*
     * NOVI FORMAT
     *
     * Ovo je format koji tvoj
     * GLAVNI SCRIPT ocekuje.
     */

    const output = {

        today: {

            items:
                formatList(
                    popularDanas
                )

        },


        last30Days: {

            items:
                formatList(
                    popular30Dana
                )

        },


        allTime: {

            items:
                formatList(
                    popularOduvek
                )

        }

    };


    /*
     * Upis fajla
     */

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


    /*
     * Ispis rezultata
     */

    printTop(
        "TOP 10 - TODAY",
        popularDanas
    );


    printTop(
        "TOP 10 - LAST 30 DAYS",
        popular30Dana
    );


    printTop(
        "TOP 10 - ALL TIME",
        popularOduvek
    );


    /*
     * Validacija
     */

    validatePopularJSON(
        output
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


    try {

        /* =================================================
           1. CREDENTIALS
        ================================================= */

        const credentials =
            getCredentials();



        /* =================================================
           2. AUTH
        ================================================= */

        const auth =
            createGoogleAuth(
                credentials
            );



        /* =================================================
           3. TOKEN
        ================================================= */

        await testGoogleAuthentication(
            auth
        );



        /* =================================================
           4. CLIENT
        ================================================= */

        const analyticsDataClient =
            createAnalyticsClient(
                credentials
            );



        /* =================================================
           5. PROPERTY
        ================================================= */

        await testGA4Property(
            analyticsDataClient
        );



        /* =================================================
           6A. TODAY
        ================================================= */

        section(
            "6A. TODAY"
        );


        let danas =
            await getPeriodData(

                analyticsDataClient,

                "Danas",

                "today",

                "today"

            );


        /*
         * Ako GA4 jos nije obradio danasnje podatke,
         * probaj juce.
         */

        if (
            danas.length === 0
        ) {

            console.log("");

            console.log(
                "⚠️ GA4 nema podatke za TODAY."
            );


            console.log(
                "Pokusavam YESTERDAY..."
            );


            const juce =
                await getPeriodData(

                    analyticsDataClient,

                    "Juce - fallback za TODAY",

                    "yesterday",

                    "yesterday"

                );


            if (
                juce.length > 0
            ) {

                console.log("");

                console.log(
                    "✅ Pronadjeni podaci za juce."
                );


                danas =
                    juce;

            } else {

                console.log("");

                console.log(
                    "⚠️ Nema ni podataka za juce."
                );

            }

        }



        /* =================================================
           6B. LAST 30 DAYS
        ================================================= */

        section(
            "6B. LAST 30 DAYS"
        );


        const poslednjih30 =
            await getPeriodData(

                analyticsDataClient,

                "Poslednjih 30 dana",

                "30daysAgo",

                "yesterday"

            );



        /* =================================================
           6C. ALL TIME
        ================================================= */

        section(
            "6C. ALL TIME"
        );


        const oduvek =
            await getPeriodData(

                analyticsDataClient,

                "Sve vreme",

                ALL_TIME_START_DATE,

                "today"

            );



        /* =================================================
           7. TOP
        ================================================= */

        section(
            "7. OBRADA TOP LISTA"
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
            popularnoDanas.length
        );


        console.log(
            "LAST 30 DAYS:",
            popularno30Dana.length
        );


        console.log(
            "ALL TIME:",
            popularnoOduvek.length
        );



        /* =================================================
           8. JSON
        ================================================= */

        createPopularJSON(

            popularnoOduvek,

            popularno30Dana,

            popularnoDanas

        );



        /* =================================================
           SUCCESS
        ================================================= */

        section(
            "USPESNO ZAVRSENO"
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
            "✅ Today"
        );


        console.log(
            "✅ Last 30 Days"
        );


        console.log(
            "✅ All Time"
        );


        console.log(
            "✅ Filtriranje"
        );


        console.log(
            "✅ Duplikati"
        );


        console.log(
            "✅ TOP 10"
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
            error.code ||
            "n/a"
        );


        console.error(
            "Message:",
            error.message ||
            "n/a"
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


        process.exit(
            1
        );

    }

}



/* =========================================================
   START
========================================================= */


createPopularJSONProcess();
