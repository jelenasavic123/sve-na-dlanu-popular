/* =========================================================
   SVE NA DLANU
   POPULAR.JS - GA4

   PRAVI:

   1. POPULARNO ODUVEK       - TOP 10
   2. NAJGLEDANIJE 30 DANA   - TOP 10
   3. NAJPOSECENIJE DANAS    - TOP 10

   DETALJNA PROVERA:

   1. GOOGLE_SERVICE_ACCOUNT_JSON postoji
   2. JSON je validan
   3. client_email postoji
   4. private_key postoji
   5. private_key ima ispravan PEM
   6. Google autentikacija radi
   7. OAuth token radi
   8. GA4 Data API radi
   9. Service Account ima pristup Property-ju
   10. Ucitava podatke
   11. Pravi popular.json

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


const GOOGLE_ANALYTICS_SCOPE =
    "https://www.googleapis.com/auth/analytics.readonly";


/* =========================================================
   NASLOVI LOGOVA
========================================================= */

function separator() {

    console.log(
        "=========================================="
    );

}


function section(
    title
) {

    console.log("");

    separator();

    console.log(
        title
    );

    separator();

}


/* =========================================================
   MASKIRANI EMAIL
========================================================= */

function maskEmail(
    email
) {

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

        return (
            "***@" +
            domain
        );

    }


    return (
        name.substring(
            0,
            2
        ) +
        "***@" +
        domain
    );

}


/* =========================================================
   GOOGLE SERVICE ACCOUNT
========================================================= */

function getCredentials() {

    section(
        "1. PROVERA GOOGLE SERVICE ACCOUNT SECRET"
    );


    const json =
        process.env.GOOGLE_SERVICE_ACCOUNT_JSON;


    if (!json) {

        console.error(
            "❌ GOOGLE_SERVICE_ACCOUNT_JSON NE POSTOJI."
        );


        console.error(
            "Proveri:"
        );


        console.error(
            "GitHub → Settings → Secrets and variables → Actions"
        );


        throw new Error(
            "Nedostaje GOOGLE_SERVICE_ACCOUNT_JSON secret."
        );

    }


    console.log(
        "✅ GOOGLE_SERVICE_ACCOUNT_JSON postoji."
    );


    console.log(
        "Duzina Secret-a:",
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

        console.error(
            "❌ Secret nije validan JSON."
        );


        console.error(
            "JSON.parse greska:"
        );


        console.error(
            error.message
        );


        throw new Error(
            "GOOGLE_SERVICE_ACCOUNT_JSON nije validan JSON."
        );

    }


    console.log(
        "✅ JSON je validan."
    );


    /* =====================================================
       TYPE
    ===================================================== */

    console.log(
        "type:",
        credentials.type ||
        "(nema)"
    );


    if (
        credentials.type !==
        "service_account"
    ) {

        console.warn(
            "⚠️ type nije service_account."
        );

    }


    /* =====================================================
       PROJECT ID
    ===================================================== */

    console.log(
        "project_id:",
        credentials.project_id ||
        "(nema)"
    );


    /* =====================================================
       CLIENT EMAIL
    ===================================================== */

    if (
        !credentials.client_email
    ) {

        console.error(
            "❌ client_email NE POSTOJI."
        );


        throw new Error(
            "Service Account JSON nema client_email."
        );

    }


    console.log(
        "client_email:",
        maskEmail(
            credentials.client_email
        )
    );


    console.log(
        "✅ client_email postoji."
    );


    /* =====================================================
       PRIVATE KEY
    ===================================================== */

    if (
        !credentials.private_key
    ) {

        console.error(
            "❌ private_key NE POSTOJI."
        );


        throw new Error(
            "Service Account JSON nema private_key."
        );

    }


    console.log(
        "private_key postoji: DA"
    );


    console.log(
        "private_key duzina:",
        credentials.private_key.length,
        "karaktera"
    );


    /* =====================================================
       PROVERA PRIVATE KEY FORMATA
    ===================================================== */

    const privateKey =
        String(
            credentials.private_key
        );


    if (
        !privateKey.includes(
            "BEGIN PRIVATE KEY"
        )
    ) {

        console.error(
            "❌ Private key nema BEGIN PRIVATE KEY."
        );


        throw new Error(
            "Private key nema ispravan PEM format."
        );

    }


    if (
        !privateKey.includes(
            "END PRIVATE KEY"
        )
    ) {

        console.error(
            "❌ Private key nema END PRIVATE KEY."
        );


        throw new Error(
            "Private key nema ispravan PEM format."
        );

    }


    console.log(
        "✅ Private key ima ispravan PEM format."
    );


    /* =====================================================
       PROVERA NEWLINE
    ===================================================== */

    const literalNewLines =
        (
            privateKey.match(
                /\\n/g
            ) || []
        ).length;


    const realNewLines =
        (
            privateKey.match(
                /\n/g
            ) || []
        ).length;


    console.log(
        "Private key literalni \\\\n:",
        literalNewLines
    );


    console.log(
        "Private key stvarni newline:",
        realNewLines
    );


    console.log(
        "✅ Private key struktura proverena."
    );


    return credentials;

}


/* =========================================================
   PROVERA GOOGLE PRIVATE KEY
========================================================= */

function testPrivateKey(
    credentials
) {

    section(
        "2. PROVERA PRIVATE KEY AUTENTIKACIJE"
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

                    GOOGLE_ANALYTICS_SCOPE

                ]

            });


        console.log(
            "GoogleAuth objekat napravljen."
        );


        console.log(
            "✅ GoogleAuth konfiguracija: OK"
        );


        return auth;

    } catch (error) {

        console.error(
            "❌ GoogleAuth nije mogao da se napravi."
        );


        console.error(
            "Greska:",
            error.message
        );


        throw new Error(
            "Private key / GoogleAuth problem: " +
            error.message
        );

    }

}


/* =========================================================
   TEST GOOGLE TOKENA
========================================================= */

async function testGoogleAuthentication(
    auth
) {

    section(
        "3. PROVERA GOOGLE AUTENTIKACIONOG TOKENA"
    );


    try {

        console.log(
            "Pokusavam da dobijem Google OAuth2 token..."
        );


        const client =
            await auth.getClient();


        if (!client) {

            throw new Error(
                "GoogleAuth nije vratio client."
            );

        }


        console.log(
            "Google Auth client napravljen."
        );


        const tokenResponse =
            await client.getAccessToken();


        if (
            !tokenResponse ||
            !tokenResponse.token
        ) {

            console.error(
                "❌ Google nije vratio access token."
            );


            throw new Error(
                "Google OAuth2 access token nije dobijen."
            );

        }


        console.log(
            "✅ Google OAuth2 access token uspesno dobijen."
        );


        console.log(
            "Token postoji: DA"
        );


        console.log(
            "Google autentikacija: OK"
        );


        return client;

    } catch (error) {

        console.error(
            "❌ GOOGLE AUTENTIKACIJA NIJE USPESNA."
        );


        console.error(
            "Error:",
            error.message
        );


        if (
            error.code
        ) {

            console.error(
                "Error code:",
                error.code
            );

        }


        throw new Error(
            "Google OAuth autentikacija nije uspela: " +
            error.message
        );

    }

}


/* =========================================================
   SRPSKO VREME
========================================================= */

function getSerbiaDateTime() {

    return new Intl.DateTimeFormat(
        "sr-RS",
        {

            timeZone:
                TIME_ZONE,

            year:
                "numeric",

            month:
                "2-digit",

            day:
                "2-digit",

            hour:
                "2-digit",

            minute:
                "2-digit",

            second:
                "2-digit",

            hour12:
                false

        }
    ).format(
        new Date()
    );

}


/* =========================================================
   PRETVORI GA PAGE PATH U ID SERIJE
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


    /* =====================================================
       UKLONI POCETNE /
    ===================================================== */

    value =
        value.replace(
            /^\/+/,
            ""
        );


    /* =====================================================
       QUERY STRING
    =====================================================

       Primer:

       series/?id=moja-serija

       -> moja-serija

    ===================================================== */

    const questionIndex =
        value.indexOf("?");


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


    /* =====================================================
       NIJE SERIJA
    ===================================================== */

    if (
        value === "series" ||
        value === "series/" ||
        value === "index.html" ||
        value === ""
    ) {

        return "";

    }


    /* =====================================================
       UKLONI INDEX.HTML
    ===================================================== */

    value =
        value.replace(
            /\/index\.html$/i,
            ""
        );


    /* =====================================================
       UKLONI .HTML
    ===================================================== */

    value =
        value.replace(
            /\.html$/i,
            ""
        );


    /* =====================================================
       POSLEDNJI DEO PUTANJE
    ===================================================== */

    value =
        value
            .split("/")
            .filter(
                Boolean
            )
            .pop() || "";


    return value.trim();

}


/* =========================================================
   GA4 CLIENT
========================================================= */

function createAnalyticsClient(
    credentials
) {

    section(
        "4. PRIPREMA GA4 DATA API CLIENTA"
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
            "✅ BetaAnalyticsDataClient uspesno napravljen."
        );


        console.log(
            "GA4 Property:",
            PROPERTY_ID
        );


        return client;

    } catch (error) {

        console.error(
            "❌ Nije moguce napraviti GA4 client."
        );


        console.error(
            error.message
        );


        throw new Error(
            "GA4 client greska: " +
            error.message
        );

    }

}


/* =========================================================
   TEST GA4 PROPERTY PRISTUPA
========================================================= */

async function testGA4Property(
    analyticsDataClient
) {

    section(
        "5. PROVERA PRISTUPA GA4 PROPERTY-JU"
    );


    console.log(
        "Property:",
        PROPERTY_ID
    );


    console.log(
        "Saljem test zahtev Google Analytics Data API-ju..."
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
                            "1daysAgo",

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
            "✅ GA4 Data API je odgovorio."
        );


        console.log(
            "Service Account ima pristup Property-ju."
        );


        console.log(
            "Broj test redova:",
            (
                response.rows ||
                []
            ).length
        );


        return true;

    } catch (error) {

        console.error("");
        console.error(
            "❌ GA4 PROPERTY TEST NIJE USPEO."
        );


        console.error(
            "HTTP / gRPC code:",
            error.code ||
            "(nije poznat)"
        );


        console.error(
            "Poruka:",
            error.message ||
            "(nema poruke)"
        );


        console.error(
            "Detalji:",
            error.details ||
            "(nema detalja)"
        );


        if (
            Number(
                error.code
            ) === 16
        ) {

            console.error("");
            console.error(
                "❌ PROBLEM JE AUTENTIKACIJA."
            );


            console.error(
                "Google nije prihvatio kredencijale."
            );


            console.error(
                "Proveri GOOGLE_SERVICE_ACCOUNT_JSON."
            );


            console.error(
                "Posebno private_key i client_email."
            );

        }


        if (
            Number(
                error.code
            ) === 7
        ) {

            console.error("");
            console.error(
                "❌ PROBLEM JE DOZVOLA ILI GOOGLE API."
            );


            console.error(
                "Service Account se autentifikovao,"
            );


            console.error(
                "ali Google nije dozvolio zahtev."
            );


            console.error(
                "Proveri da li je Google Analytics Data API ukljucen."
            );


            console.error(
                "Takodje proveri pristup Service Account-a Property-ju."
            );


            console.error(
                "Property:",
                PROPERTY_ID
            );

        }


        if (
            Number(
                error.code
            ) === 5
        ) {

            console.error("");
            console.error(
                "❌ GA4 PROPERTY NIJE PRONADJEN."
            );


            console.error(
                "Proveri PROPERTY_ID:",
                PROPERTY_ID
            );

        }


        throw error;

    }

}


/* =========================================================
   UCITAVANJE JEDNOG GA4 PERIODA
========================================================= */

async function getAnalyticsPeriod(
    analyticsDataClient,
    label,
    startDate,
    endDate
) {

    console.log("");
    console.log(
        "------------------------------------------"
    );


    console.log(
        "UCITAVAM:",
        label
    );


    console.log(
        "startDate:",
        startDate
    );


    console.log(
        "endDate:",
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
                    100

            });


        const rows =
            response.rows ||
            [];


        console.log(
            "✅ GA4 podaci ucitani:"
        );


        console.log(
            "Period:",
            label
        );


        console.log(
            "Broj GA4 redova:",
            rows.length
        );


        return rows.map(
            function(row) {

                const pagePath =
                    row.dimensionValues?.[0]?.value ||
                    "";


                const views =
                    Number(
                        row.metricValues?.[0]?.value ||
                        0
                    );


                const id =
                    convertPageToId(
                        pagePath
                    );


                return {

                    originalPath:
                        pagePath,

                    id:
                        id,

                    visits:
                        views

                };

            }
        );


    } catch (error) {

        console.error("");
        console.error(
            "❌ GRESKA PRI UCITAVANJU:",
            label
        );


        console.error(
            "Code:",
            error.code
        );


        console.error(
            "Message:",
            error.message
        );


        console.error(
            "Details:",
            error.details
        );


        throw error;

    }

}


/* =========================================================
   FILTRIRANJE SERIJA
========================================================= */

function filterSeriesPages(
    data
) {

    return data.filter(
        function(item) {

            if (
                !item.id
            ) {

                return false;

            }


            const id =
                String(
                    item.id
                ).trim().toLowerCase();


            if (
                id === "index"
            ) {

                return false;

            }


            if (
                id === "index.html"
            ) {

                return false;

            }


            if (
                id === "series"
            ) {

                return false;

            }


            if (
                id === "home"
            ) {

                return false;

            }


            return true;

        }
    );

}


/* =========================================================
   UKLONI DUPLIKATE
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


            if (
                !id
            ) {

                return;

            }


            const old =
                map.get(
                    id
                );


            if (
                old
            ) {

                old.visits +=
                    Number(
                        item.visits ||
                        0
                    );

            } else {

                map.set(
                    id,
                    {

                        id:
                            id,

                        visits:
                            Number(
                                item.visits ||
                                0
                            )

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
   SORTIRAJ I UZMI TOP 10
========================================================= */

function getTop(
    data
) {

    return data
        .sort(
            function(a, b) {

                return (
                    Number(
                        b.visits ||
                        0
                    ) -
                    Number(
                        a.visits ||
                        0
                    )
                );

            }
        )
        .slice(
            0,
            TOP_LIMIT
        );

}


/* =========================================================
   OBRADA GA4 PODATAKA
========================================================= */

function processAnalytics(
    rows
) {

    const filtered =
        filterSeriesPages(
            rows
        );


    const unique =
        removeDuplicates(
            filtered
        );


    return getTop(
        unique
    );

}


/* =========================================================
   ISPIS TOP LISTE
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
        !data ||
        data.length === 0
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
   PRETVORI ZA JSON
========================================================= */

function prepareItems(
    data
) {

    return data.map(
        function(item) {

            return {

                id:
                    item.id,

                visits:
                    Number(
                        item.visits ||
                        0
                    )

            };

        }
    );

}


/* =========================================================
   NAPRAVI POPULAR.JSON
========================================================= */

function createPopularJSON(
    allTime,
    last30Days,
    today
) {

    section(
        "7. PRAVLJENJE popular.json"
    );


    const output = {

        updatedAt:
            new Date().toISOString(),


        updatedAtSerbia:
            getSerbiaDateTime(),


        timezone:
            TIME_ZONE,


        propertyId:
            PROPERTY_ID,


        topLimit:
            TOP_LIMIT,


        popularnoOduvek: {

            period:
                "oduvek",

            count:
                allTime.length,

            items:
                prepareItems(
                    allTime
                )

        },


        najgledanije30Dana: {

            period:
                "30 dana",

            count:
                last30Days.length,

            items:
                prepareItems(
                    last30Days
                )

        },


        najposecenijeDanas: {

            period:
                "danas",

            count:
                today.length,

            items:
                prepareItems(
                    today
                )

        }

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
        "✅ popular.json uspesno napravljen."
    );


    console.log(
        "Lokacija:",
        OUTPUT_FILE
    );


    console.log(
        "Oduvek:",
        allTime.length
    );


    console.log(
        "30 dana:",
        last30Days.length
    );


    console.log(
        "Danas:",
        today.length
    );


    printTop(
        "TOP 10 - POPULARNO ODUVEK",
        allTime
    );


    printTop(
        "TOP 10 - NAJGLEDANIJE 30 DANA",
        last30Days
    );


    printTop(
        "TOP 10 - NAJPOSECENIJE DANAS",
        today
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
        "Vreme Srbije:",
        getSerbiaDateTime()
    );


    console.log(
        "Property:",
        PROPERTY_ID
    );


    console.log(
        "TOP limit:",
        TOP_LIMIT
    );


    console.log(
        "Kreiramo 3 popularne liste:"
    );


    console.log(
        "1. Popularno oduvek"
    );


    console.log(
        "2. Najgledanije 30 dana"
    );


    console.log(
        "3. Najposecenije danas"
    );


    try {

        /* =================================================
           1. CREDENTIALS
        ================================================= */

        const credentials =
            getCredentials();


        /* =================================================
           2. GOOGLE AUTH
        ================================================= */

        const auth =
            testPrivateKey(
                credentials
            );


        /* =================================================
           3. OAUTH TOKEN
        ================================================= */

        await testGoogleAuthentication(
            auth
        );


        /* =================================================
           4. GA4 CLIENT
        ================================================= */

        const analyticsDataClient =
            createAnalyticsClient(
                credentials
            );


        /* =================================================
           5. PROPERTY ACCESS
        ================================================= */

        await testGA4Property(
            analyticsDataClient
        );


        /* =================================================
           6. POPULARNO ODUVEK
        ================================================= */

        section(
            "6A. POPULARNO ODUVEK"
        );


        /*
         * GA4 nema beskonacnu istoriju.
         *
         * Koristimo dovoljno star pocetak.
         * Stvarna dostupnost zavisi od GA4
         * data retention podesavanja.
         */

        const allTimeRows =
            await getAnalyticsPeriod(

                analyticsDataClient,

                "Popularno oduvek",

                "2020-01-01",

                "today"

            );


        const allTime =
            processAnalytics(
                allTimeRows
            );


        printTop(
            "TOP 10 - POPULARNO ODUVEK",
            allTime
        );


        /* =================================================
           7. POSLEDNJIH 30 DANA
        ================================================= */

        section(
            "6B. NAJGLEDANIJE 30 DANA"
        );


        const last30Rows =
            await getAnalyticsPeriod(

                analyticsDataClient,

                "Najgledanije 30 dana",

                "30daysAgo",

                "yesterday"

            );


        const last30Days =
            processAnalytics(
                last30Rows
            );


        printTop(
            "TOP 10 - NAJGLEDANIJE 30 DANA",
            last30Days
        );


        /* =================================================
           8. DANAS
        ================================================= */

        section(
            "6C. NAJPOSECENIJE DANAS"
        );


        const todayRows =
            await getAnalyticsPeriod(

                analyticsDataClient,

                "Najposecenije danas",

                "today",

                "today"

            );


        const today =
            processAnalytics(
                todayRows
            );


        printTop(
            "TOP 10 - NAJPOSECENIJE DANAS",
            today
        );


        /* =================================================
           9. JSON
        ================================================= */

        createPopularJSON(

            allTime,

            last30Days,

            today

        );


        /* =================================================
           USPESNO
        ================================================= */

        section(
            "USPESNO ZAVRSENO"
        );


        console.log(
            "✅ Google autentikacija: OK"
        );


        console.log(
            "✅ Private key: OK"
        );


        console.log(
            "✅ OAuth token: OK"
        );


        console.log(
            "✅ GA4 Data API: OK"
        );


        console.log(
            "✅ GA4 Property pristup: OK"
        );


        console.log(
            "✅ Popularno oduvek: OK"
        );


        console.log(
            "✅ Najgledanije 30 dana: OK"
        );


        console.log(
            "✅ Najposecenije danas: OK"
        );


        console.log(
            "✅ popular.json: OK"
        );


        console.log(
            "Vreme Srbije:",
            getSerbiaDateTime()
        );


        console.log("");

    } catch (error) {

        section(
            "GRESKA"
        );


        console.error(
            "❌ popular.js NIJE USPESNO ZAVRSEN."
        );


        console.error("");


        console.error(
            "Error code:",
            error.code ||
            "(nije poznat)"
        );


        console.error(
            "Error message:",
            error.message ||
            "(nema poruke)"
        );


        if (
            error.details
        ) {

            console.error(
                "Error details:",
                error.details
            );

        }


        console.error("");


        console.error(
            "=========================================="
        );


        console.error(
            "DIJAGNOSTIKA"
        );


        console.error(
            "=========================================="
        );


        if (
            Number(
                error.code
            ) === 16
        ) {

            console.error(
                "❌ 16 UNAUTHENTICATED"
            );


            console.error(
                "Google nije prihvatio autentikacione kredencijale."
            );


            console.error(
                "Proveri GOOGLE_SERVICE_ACCOUNT_JSON."
            );


            console.error(
                "Posebno private_key i client_email."
            );

        }


        else if (
            Number(
                error.code
            ) === 7
        ) {

            console.error(
                "❌ 7 PERMISSION_DENIED"
            );


            console.error(
                "Service Account se autentifikovao,"
            );


            console.error(
                "ali Google nije dozvolio zahtev."
            );


            console.error(
                "Proveri Google Analytics Data API."
            );


            console.error(
                "Proveri da li je API ukljucen u Google Cloud projektu."
            );


            console.error(
                "Proveri i GA4 Property Access Management."
            );


            console.error(
                "Property:",
                PROPERTY_ID
            );

        }


        else if (
            Number(
                error.code
            ) === 5
        ) {

            console.error(
                "❌ 5 NOT_FOUND"
            );


            console.error(
                "GA4 Property nije pronadjen."
            );


            console.error(
                "Proveri PROPERTY_ID:",
                PROPERTY_ID
            );

        }


        else {

            console.error(
                "❌ Nepoznata Google/API greska."
            );


            console.error(
                "Kod:",
                error.code ||
                "n/a"
            );

        }


        console.error("");


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
