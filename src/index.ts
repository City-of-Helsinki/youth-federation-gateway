import { ApolloServer } from "apollo-server-express";
import { ApolloGateway } from '@apollo/gateway';
import * as cors from "cors";
import * as dotenv  from "dotenv";
import * as express from "express";
import { AuthenticatedDataSource } from "./dataSources"

dotenv.config();

const debug: boolean = process.env.DEBUG === "debug" || process.env.NODE_ENV !== "production";

const port: string = process.env.PORT || "3000";
const openCityProfileBackendName: string = process.env.OPEN_CITY_PROFILE_API_NAME;
const openCityProfileBackendUrl: string = process.env.OPEN_CITY_PROFILE_API_URL;
const youthMembershipBackendName: string = process.env.YOUTH_MEMBERSHIP_API_NAME;
const youthMembershipBackendUrl: string = process.env.YOUTH_MEMBERSHIP_API_URL;


const gateway = new ApolloGateway({
    serviceList: [
        // name of the service is the same as its API scope for auth purposes
        { name: openCityProfileBackendName, url: openCityProfileBackendUrl },
        { name: youthMembershipBackendName, url: youthMembershipBackendUrl },
    ],
    buildService({ name, url }) {
        return new AuthenticatedDataSource({ name, url });
    },
    experimental_pollInterval: 600000,  // every 10 min
});


(async () => {
    const server = new ApolloServer({
        gateway,
        subscriptions: false,
        context: ({ req }) => {
            const apiTokens: string = req.headers["api-tokens"] || "";
            const acceptLanguage: string = req.headers["accept-language"] || "";
            const clientIP: string = req.headers["x-real-ip"] || req.ip;
            return { apiTokens, acceptLanguage, clientIP };
        },
        debug: debug,
        playground: debug,
        introspection: debug
    });

    const app = express();

    app.use(cors());

    // GraphQL Voyager schema visualization
    if (debug) {
        const voyagerMiddleware = require('graphql-voyager/middleware').express;
        app.use('/voyager', voyagerMiddleware({
            endpointUrl: '/graphql',
            displayOptions: {
                sortByAlphabet: true,
            },
        }));
    }

    // TODO: check that app actually works
    app.get("/readiness", ( req, res ) => {
        res.status(200).json({status: "OK"});
    });

    app.get( "/healthz", ( req, res ) => {
        res.status(200).json({status: "OK"});
    });

    server.applyMiddleware({ app, path: "/" });

    app.listen({ port }, () =>
        // eslint-disable-next-line no-console
        console.log(`🚀 Server ready at http://localhost:${port}`)
    );
})();
