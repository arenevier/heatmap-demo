# heatmap-demo

This is a simple application to showcase the use of
[activities-heatmap](https://github.com/arenevier/activities-heatmap) library.
It displays a heatmap of my list of Strava activities from 2018 to 2024. A
running version of this application is available at
https://heatmap.renevier.net/

It is a node.js application using [koa](https://github.com/koajs/koa) to server
the static files and the heatmap tiles.

The heatmap data is gathered from a PostGis database that contains my strava data.
Alternatively, you could the data directly from strava bulk export zip file.
But it can be quite slow to load if you have a lot of activities.
