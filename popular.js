/* =========================================================
   SVE NA DLANU
   POPULAR.JS - GA4

   AUTOMATSKO PRAVLJENJE popular.json

   TOP 50
   today = 50
   last30Days = 50
   allTime = 50

   posts.json DIREKTNO SA CLOUDFLARE-A

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
        name.substring(0,2) +
        "***@" +
        domain
    );


}





/* =========================================================
   UCITAVANJE posts.json SA CLOUDFLARE-A
========================================================= */


function loadPostsFromCloudflare() {


    return new Promise(
        function(resolve,reject){


            console.log("");

            console.log(
                "Ucitavam:"
            );

            console.log(
                POSTS_URL
            );



            const request =
                https.get(
                    POSTS_URL,
                    function(response){



                        let body = "";



                        response.setEncoding(
                            "utf8"
                        );



                        response.on(
                            "data",
                            function(chunk){

                                body += chunk;

                            }
                        );



                        response.on(
                            "end",
                            function(){


                                console.log(
                                    "HTTP:",
                                    response.statusCode
                                );



                                if(
                                    response.statusCode !== 200
                                ){

                                    reject(
                                        new Error(
                                            "Cloudflare HTTP greska: " +
                                            response.statusCode
                                        )
                                    );

                                    return;

                                }



                                try {


                                    const json =
                                        JSON.parse(
                                            body
                                        );



                                    if(
                                        !Array.isArray(json)
                                    ){

                                        throw new Error(
                                            "posts.json nije niz"
                                        );

                                    }



                                    console.log(
                                        "✅ posts.json ucitan"
                                    );


                                    console.log(
                                        "Broj stavki:",
                                        json.length
                                    );



                                    resolve(json);



                                }
                                catch(error){


                                    reject(
                                        new Error(
                                            "JSON greska: " +
                                            error.message
                                        )
                                    );


                                }



                            }
                        );



                    }
                );



            request.on(
                "error",
                function(error){

                    reject(error);

                }
            );



        }
    );


}





/* =========================================================
   KREIRANJE MAPE SERIJA
========================================================= */


function createSeriesMap(posts){


    const map =
        new Map();



    posts.forEach(
        function(item){


            if(
                !item ||
                typeof item !== "object"
            ){

                return;

            }



            const id =
                String(
                    item.id || ""
                )
                .trim()
                .toLowerCase();



            if(!id){

                return;

            }



            map.set(
                id,
                {

                    id:id,

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
        "Dozvoljene serije:",
        map.size
    );



    return map;


}





/* =========================================================
   GOOGLE CREDENTIALS
========================================================= */


function getCredentials(){


    section(
        "GOOGLE SERVICE ACCOUNT"
    );



    const json =
        process.env.GOOGLE_SERVICE_ACCOUNT_JSON;



    if(!json){


        throw new Error(
            "Nedostaje GOOGLE_SERVICE_ACCOUNT_JSON"
        );


    }



    let credentials;



    try {


        credentials =
            JSON.parse(
                json
            );


    }
    catch(error){


        throw new Error(
            "Service account JSON nije validan"
        );


    }




    if(
        !credentials.client_email ||
        !credentials.private_key
    ){

        throw new Error(
            "Nedostaje client_email ili private_key"
        );

    }



    console.log(
        "Email:",
        maskEmail(
            credentials.client_email
        )
    );


    console.log(
        "Private key OK"
    );



    return credentials;


}





/* =========================================================
   GOOGLE AUTH
========================================================= */


function createGoogleAuth(credentials){



    const auth =
        new GoogleAuth({


            credentials:{


                client_email:
                    credentials.client_email,


                private_key:
                    credentials.private_key


            },


            scopes:[


                "https://www.googleapis.com/auth/analytics.readonly"


            ]


        });



    console.log(
        "✅ Google Auth OK"
    );



    return auth;


}





/* =========================================================
   GA4 CLIENT
========================================================= */


function createAnalyticsClient(credentials){



    const client =
        new BetaAnalyticsDataClient({


            credentials:{


                client_email:
                    credentials.client_email,


                private_key:
                    credentials.private_key


            }


        });



    console.log(
        "✅ GA4 Client OK"
    );


    return client;


}

/* =========================================================
   NORMALIZACIJA URL-A
========================================================= */


function normalizePath(value){


    if(!value){

        return "";

    }



    let url =
        String(value)
        .trim();



    try{


        if(
            url.startsWith("http://") ||
            url.startsWith("https://")
        ){

            const u =
                new URL(url);


            url =
                u.pathname +
                u.search;

        }


    }
    catch(e){}



    const hash =
        url.indexOf("#");


    if(hash !== -1){

        url =
            url.substring(
                0,
                hash
            );

    }



    return url.replace(
        /^\/+/,
        ""
    );


}







/* =========================================================
   ID IZ QUERY PARAMETRA
========================================================= */


function getIdFromQuery(value) {

    if (!value) {
        return "";
    }

    try {

        let text = String(value).trim();

        /*
         * Ako postoji URL:
         * https://nadlanu.online/series/?id=xxx
         */
        if (
            text.startsWith("http://") ||
            text.startsWith("https://")
        ) {

            const url = new URL(text);

            text =
                url.pathname +
                url.search;

        }

        /*
         * Uzmi deo posle prvog ?
         */
        const questionIndex =
            text.indexOf("?");

        if (questionIndex === -1) {
            return "";
        }

        let query =
            text.substring(
                questionIndex + 1
            );

        /*
         * POPRAVKA:
         *
         * Ako GA4 vrati:
         *
         * ?id=serija?id=serija
         *
         * uzimamo samo prvi deo.
         */
        const duplicateQueryIndex =
            query.indexOf("?");

        if (duplicateQueryIndex !== -1) {

            query =
                query.substring(
                    0,
                    duplicateQueryIndex
                );

        }

        const params =
            new URLSearchParams(query);

        const keys = [
            "id",
            "series",
            "seriesId",
            "slug",
            "post",
            "postId"
        ];

        for (const key of keys) {

            const result =
                params.get(key);

            if (result) {

                return String(result)
                    .split("?")[0]
                    .split("&")[0]
                    .trim()
                    .toLowerCase();

            }

        }

    }
    catch (e) {

        console.log(
            "Greska pri citanju ID-a:",
            value
        );

    }

    return "";
}






/* =========================================================
   PRONALAZENJE SERIJE IZ GA4 URL-a
========================================================= */


function findSeriesId(pagePath,seriesMap){



    if(!pagePath){

        return null;

    }



    const queryId =
        getIdFromQuery(
            pagePath
        );



    if(
        queryId &&
        seriesMap.has(queryId)
    ){

        return queryId;

    }




    const normalized =
        normalizePath(
            pagePath
        );



    const clean =
        normalized
        .split("?")[0];



    const parts =
        clean
        .split("/")
        .filter(Boolean);




    for(
        const part of parts
    ){


        let id =
            decodeURIComponent(
                part
            )
            .toLowerCase()
            .replace(
                ".html",
                ""
            )
            .trim();



        if(
            seriesMap.has(id)
        ){

            return id;

        }


    }




    return null;


}








/* =========================================================
   GA4 PERIOD
========================================================= */


async function getPeriodData(

    analyticsDataClient,

    periodName,

    startDate,

    endDate,

    seriesMap

){



    console.log("");

    console.log(
        "=========================================="
    );

    console.log(
        periodName,
        startDate,
        "->",
        endDate
    );

    console.log(
        "=========================================="
    );



    const [
        response
    ] =
    await analyticsDataClient.runReport({



        property:
            `properties/${PROPERTY_ID}`,



        dateRanges:[


            {

                startDate:startDate,

                endDate:endDate

            }


        ],



        dimensions:[


            {

                name:
                    "pagePathPlusQueryString"

            }


        ],



        metrics:[


            {

                name:
                    "screenPageViews"

            }


        ],



        orderBys:[


            {

                metric:{


                    metricName:
                        "screenPageViews",


                    order:
                        "DESCENDING"


                }


            }


        ],



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




    rows.forEach(
        function(row){



            const path =
                row
                .dimensionValues[0]
                .value;



            const views =
                Number(
                    row
                    .metricValues[0]
                    .value
                );



            const id =
                findSeriesId(
                    path,
                    seriesMap
                );



            if(!id){

                return;

            }



            const old =
                totals.get(id) || 0;



            totals.set(
                id,
                old + views
            );



        }
    );





    const result = [];



    totals.forEach(
        function(views,id){


            result.push({

                id:id,

                views:Number(views)

            });


        }
    );




    result.sort(
        function(a,b){

            return b.views - a.views;

        }
    );




    console.log(
        "Pronadjeno serija:",
        result.length
    );



    return result;



}

/* =========================================================
   TOP LIMIT
========================================================= */


function getTop(data){


    if(!Array.isArray(data)){

        return [];

    }



    return data
        .sort(
            (a,b)=>
                b.views - a.views
        )
        .slice(
            0,
            TOP_LIMIT
        );


}





/* =========================================================
   FORMAT ZA JSON
========================================================= */


function formatList(data){


    return data.map(
        function(item){


            return {

                id:
                    String(
                        item.id
                    ),


                views:
                    Number(
                        item.views
                    )


            };


        }
    );


}







/* =========================================================
   VALIDACIJA
========================================================= */


function validatePopularJSON(data,seriesMap){



    const keys = [

        "today",
        "last30Days",
        "allTime"

    ];



    keys.forEach(
        function(key){


            if(
                !Array.isArray(
                    data[key]
                )
            ){

                throw new Error(
                    key +
                    " nije niz"
                );

            }



            if(
                data[key].length > TOP_LIMIT
            ){

                throw new Error(
                    key +
                    " ima vise od 50"
                );

            }




            data[key].forEach(
                function(item){


                    if(
                        !seriesMap.has(
                            item.id
                        )
                    ){

                        throw new Error(
                            "ID ne postoji u posts.json: "
                            + item.id
                        );

                    }



                }
            );



        }
    );



    console.log(
        "✅ popular.json validan"
    );


}





/* =========================================================
   KREIRANJE popular.json
========================================================= */


function createPopularJSON(

    today,

    last30,

    allTime,

    seriesMap

){



    const json = {


        today:
            formatList(
                getTop(today)
            ),



        last30Days:
            formatList(
                getTop(last30)
            ),



        allTime:
            formatList(
                getTop(allTime)
            )



    };





    fs.writeFileSync(

        OUTPUT_FILE,

        JSON.stringify(
            json,
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
        "✅ popular.json napravljen"
    );

    console.log(
        "Lokacija:",
        OUTPUT_FILE
    );


    console.log(
        "Today:",
        json.today.length
    );


    console.log(
        "Last30:",
        json.last30Days.length
    );


    console.log(
        "AllTime:",
        json.allTime.length
    );



    validatePopularJSON(
        json,
        seriesMap
    );



    return json;


}







/* =========================================================
   GLAVNI START
========================================================= */


async function start(){



try {



    section(
        "SVE NA DLANU - POPULAR.JS"
    );




    /*
       1. POSTS.JSON
    */


    const posts =
        await loadPostsFromCloudflare();




    const seriesMap =
        createSeriesMap(
            posts
        );




    /*
       2. GOOGLE
    */


    const credentials =
        getCredentials();




    const auth =
        createGoogleAuth(
            credentials
        );




    await auth.getClient();




    const analytics =
        createAnalyticsClient(
            credentials
        );






    /*
       3. GA4
    */



    const today =
        await getPeriodData(

            analytics,

            "TODAY",

            "1daysAgo",

            "today",

            seriesMap

        );




    const last30 =
        await getPeriodData(

            analytics,

            "LAST 30 DAYS",

            "30daysAgo",

            "yesterday",

            seriesMap

        );




    const allTime =
        await getPeriodData(

            analytics,

            "ALL TIME",

            ALL_TIME_START_DATE,

            "today",

            seriesMap

        );






    /*
       4. JSON
    */


    createPopularJSON(

        today,

        last30,

        allTime,

        seriesMap

    );





    console.log("");

    console.log(
        "=========================================="
    );

    console.log(
        "SVE USPESNO ZAVRSENO"
    );

    console.log(
        "=========================================="
    );




}
catch(error){



    console.error("");

    console.error(
        "❌ GRESKA"
    );


    console.error(
        error.message
    );


    process.exit(1);



}



}






/* =========================================================
   RUN
========================================================= */


start();
