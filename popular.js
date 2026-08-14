/* =========================================================
   SVE NA DLANU
   POPULAR.JS - GA4

   - Google Analytics 4 Data API
   - Uzima najposecenije stranice
   - Pretvara URL stranice u ID serije
   - Cuva TOP 20 u popular.json
   - GitHub Actions ga pokrece svaki dan
========================================================= */

const fs = require("fs");
const path = require("path");

const {
    BetaAnalyticsDataClient
} = require("@google-analytics/data");


/* =========================================================
   PODESAVANJA
========================================================= */

const PROPERTY_ID =
    "549759235";

const TOP_LIMIT =
    20;

const OUTPUT_FILE =
    path.join(
        __dirname,
        "popular.json"
    );

const TIME_ZONE =
    "Europe/Belgrade";


/* =========================================================
   GOOGLE SERVICE ACCOUNT
========================================================= */

function getCredentials() {

    const json =
        process.env.GOOGLE_SERVICE_ACCOUNT_JSON;


    if (!json) {

        throw new Error(
            "Nedostaje GOOGLE_SERVICE_ACCOUNT_JSON secret."
        );

    }


    let credentials;


    try {

        credentials =
            JSON.parse(json);

    } catch (error) {

        throw new Error(
            "GOOGLE_SERVICE_ACCOUNT_JSON nije validan JSON."
        );

    }


    if (
        !credentials.client_email ||
        !credentials.private_key
    ) {

        throw new Error(
            "Google service account JSON nema client_email ili private_key."
        );

    }


    return credentials;

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


    /*
     * ============================================
     * PRIMER:
     *
     * /moja-serija-001.html
     *
     * POSTAJE:
     *
     * moja-serija-001
     * ============================================
     */


    value =
        value.replace(
            /^\/+/,
            ""
        );


    /*
     * Ako postoji query string,
     * ukloni ga.
     *
     * npr:
     *
     * series/?id=moja-serija-001
     *
     */


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


        /*
         * Ako postoji:
         *
         * ?id=moja-serija-001
         *
         * uzmi upravo taj ID.
         */


        const id =
            params.get("id");


        if (id) {

            return String(
                id
            ).trim();

        }


        /*
         * Ako nema id parametra,
         * ukloni query.
         */


        value =
            value.substring(
                0,
                questionIndex
            );

    }


    /*
     * Ako je:
     *
     * series/
     *
     * to nije serija.
     */


    if (
        value === "series" ||
        value === "series/" ||
        value === "index.html" ||
        value === ""
    ) {

        return "";

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
     *
     * moja-serija-001.html
     *
     * ->
     *
     * moja-serija-001
     */


    value =
        value.replace(
            /\.html$/i,
            ""
        );


    /*
     * Ako je ostala putanja,
     * uzmi poslednji deo.
     *
     * npr:
     *
     * series/moja-serija-001
     *
     * ->
     *
     * moja-serija-001
     */


    value =
        value
            .split("/")
            .filter(Boolean)
            .pop() || "";


    return value.trim();

}


/* =========================================================
   GA4 PODACI
========================================================= */

async function getAnalyticsData() {

    console.log(
        "Povezujem se sa Google Analytics..."
    );


    console.log(
        "Property:",
        PROPERTY_ID
    );


    const credentials =
        getCredentials();


    const analyticsDataClient =
        new BetaAnalyticsDataClient(
            {
                credentials: {

                    client_email:
                        credentials.client_email,

                    private_key:
                        credentials.private_key

                }
            }
        );


    console.log(
        "Citam podatke..."
    );


    /*
     * GA4:
     *
     * pagePath
     * = putanja stranice
     *
     * screenPageViews
     * = broj pregleda
     *
     * period:
     * poslednjih 30 dana
     */


    const [
        response
    ] =
        await analyticsDataClient.runReport({

            property:
                `properties/${PROPERTY_ID}`,

            dateRanges: [

                {
                    startDate:
                        "30daysAgo",

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
        response.rows || [];


    console.log(
        "GA4 redova:",
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


            console.log(
                "GA:",
                pagePath,
                "->",
                id,
                "->",
                views
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

}


/* =========================================================
   FILTRIRANJE
========================================================= */

function filterSeriesPages(
    data
) {

    return data.filter(
        function(item) {

            if (!item.id) {

                return false;

            }


            /*
             * Glavna stranica
             */


            if (
                item.id ===
                "index"
            ) {

                return false;

            }


            if (
                item.id ===
                "index.html"
            ) {

                return false;

            }


            if (
                item.id ===
                "series"
            ) {

                return false;

            }


            /*
             * Ako je Google Analytics
             * poslao neki sistemski URL
             * bez ID-ja, preskoci.
             */


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
                    item.id || ""
                ).trim();


            if (!id) {

                return;

            }


            const old =
                map.get(
                    id
                );


            /*
             * Ako se isti ID pojavi
             * vise puta, saberi preglede.
             */


            if (old) {

                old.visits +=
                    Number(
                        item.visits || 0
                    );

            } else {

                map.set(
                    id,
                    {
                        id:
                            id,

                        visits:
                            Number(
                                item.visits || 0
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
   NAPRAVI POPULAR.JSON
========================================================= */

async function createPopularJSON() {

    console.log("");

    console.log(
        "=========================================="
    );

    console.log(
        " SVE NA DLANU - GA4 POPULARNO"
    );

    console.log(
        "=========================================="
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
        "Period:",
        "30 dana"
    );


    console.log(
        "=========================================="
    );


    try {

        /*
         * ========================================
         * 1. UZMI GA4
         * ========================================
         */


        const analytics =
            await getAnalyticsData();


        /*
         * ========================================
         * 2. FILTRIRAJ
         * ========================================
         */


        const seriesPages =
            filterSeriesPages(
                analytics
            );


        /*
         * ========================================
         * 3. UKLONI DUPLIKATE
         * ========================================
         */


        const uniqueSeries =
            removeDuplicates(
                seriesPages
            );


        /*
         * ========================================
         * 4. SORTIRAJ
         * ========================================
         */


        const popular =
            uniqueSeries
                .sort(
                    function(a, b) {

                        return (
                            Number(
                                b.visits || 0
                            ) -
                            Number(
                                a.visits || 0
                            )
                        );

                    }
                )
                .slice(
                    0,
                    TOP_LIMIT
                );


        /*
         * ========================================
         * 5. ISPIS
         * ========================================
         */


        console.log("");

        console.log(
            "TOP 20:"
        );


        popular.forEach(
            function(item, index) {

                console.log(
                    `${index + 1}. ${item.id} - ${item.visits} pregleda`
                );

            }
        );


        /*
         * ========================================
         * 6. JSON
         * ========================================
         */


        const output = {

            updatedAt:
                new Date().toISOString(),

            updatedAtSerbia:
                getSerbiaDateTime(),

            timezone:
                TIME_ZONE,

            propertyId:
                PROPERTY_ID,

            period:
                "30 dana",

            count:
                popular.length,

            items:
                popular.map(
                    function(item) {

                        return {

                            id:
                                item.id,

                            visits:
                                Number(
                                    item.visits || 0
                                )

                        };

                    }
                )

        };


        /*
         * ========================================
         * 7. SACUVAJ
         * ========================================
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


        /*
         * ========================================
         * 8. GOTOVO
         * ========================================
         */


        console.log("");

        console.log(
            "=========================================="
        );

        console.log(
            " USPESNO!"
        );

        console.log(
            "=========================================="
        );


        console.log(
            "Napravljen:"
        );


        console.log(
            OUTPUT_FILE
        );


        console.log(
            "Broj:",
            popular.length
        );


        console.log(
            "Vreme Srbije:",
            getSerbiaDateTime()
        );


        console.log(
            "=========================================="
        );

        console.log("");

    } catch (error) {

        console.error("");

        console.error(
            "=========================================="
        );

        console.error(
            " GRESKA"
        );

        console.error(
            "=========================================="
        );


        console.error(
            error
        );


        console.error("");

        process.exit(
            1
        );

    }

}


/* =========================================================
   START
========================================================= */

createPopularJSON();
