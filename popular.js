/* =========================================================
   SVE NA DLANU
   POPULAR.JS - GA4

   - Google Analytics 4 Data API
   - Uzima najposecenije stranice
   - Pretvara URL stranice u ID
   - Cuva TOP 20 u popular.json
   - GitHub Actions ga pokrece svaki dan
========================================================= */

const fs = require("fs");
const path = require("path");

const { BetaAnalyticsDataClient } =
    require("@google-analytics/data");


/* =========================================================
   PODESAVANJA
========================================================= */

const PROPERTY_ID = "549759235";

const TOP_LIMIT = 20;

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
   ID IZ PAGE PATH
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
     * Ako je:
     *
     * /moja-serija-001.html
     *
     * dobijamo:
     *
     * moja-serija-001.html
     */

    value =
        value.replace(
            /^\/+/,
            ""
        );


    /*
     * Ako GA vrati samo:
     *
     * index.html
     *
     * ostavljamo index.html
     */

    return value;

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
     * pagePath
     * = URL putanja stranice
     *
     * screenPageViews
     * = broj pregleda stranice
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
                        "yesterday",

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


            return {

                id:
                    convertPageToId(
                        pagePath
                    ),

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
             * Ignorisemo glavnu stranicu.
             */

            if (
                item.id ===
                "index.html"
            ) {

                return false;

            }


            /*
             * Uzimamo samo HTML stranice.
             */

            if (
                !item.id
                    .toLowerCase()
                    .endsWith(
                        ".html"
                    )
            ) {

                return false;

            }


            return true;

        }
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
        "=========================================="
    );


    try {

        /*
         * Uzmi GA4
         */

        const analytics =
            await getAnalyticsData();


        /*
         * Filtriraj samo stranice serija
         */

        const seriesPages =
            filterSeriesPages(
                analytics
            );


        /*
         * Sortiraj
         */

        const popular =
            seriesPages
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
         * JSON
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
                "yesterday",

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
         * Sacuvaj
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
            error.message
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
