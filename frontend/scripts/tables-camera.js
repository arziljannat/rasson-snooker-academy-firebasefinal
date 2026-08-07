/******************************************************
 * RASSON CAMERA SYSTEM
 * Rasson1 + Rasson4
 * ADMIN / SUPER ADMIN ONLY
 * Separate from Tables / Billing / Timer logic
 ******************************************************/

(() => {

    const CAMERA_CONFIG = {

        rasson1: [
            {
                id: "hall",
                title: "HALL CAMERA",
                path: "/hall/stream.m3u8"
            },
            {
                id: "table34",
                title: "TABLE 3 & 4 CAMERA",
                path: "/table34/stream.m3u8"
            }
        ],

        rasson4: [
            {
                id: "table1",
                title: "TABLE 1 & 2 CAMERA",
                path: "/table1/stream.m3u8"
            },
            {
                id: "table345",
                title: "TABLE 3 / 4 / 5 CAMERA",
                path: "/table345/stream.m3u8"
            },
            {
                id: "room1",
                title: "ROOM 1 CAMERA",
                path: "/room1/stream.m3u8"
            },
            {
                id: "room2",
                title: "ROOM 2 CAMERA",
                path: "/room2/stream.m3u8"
            },
            {
                id: "room3",
                title: "ROOM 3 CAMERA",
                path: "/room3/stream.m3u8"
            }
        ]

    };


    /*
     * Har camera ka apna HLS instance
     */
    const hlsInstances = {};

    /*
 * Har camera ka live watchdog timer
 */
const cameraWatchdogs = {};


    /*
     * Multiple render calls ko control karne ke liye
     */
    let renderInProgress = false;


    /******************************************************
     * GET CURRENT BRANCH
     ******************************************************/

    function getCameraBranch() {

        if (
            typeof BRANCH !== "undefined" &&
            BRANCH
        ) {
            return String(BRANCH)
                .toLowerCase()
                .trim();
        }

        return String(
            localStorage.getItem("branch") || ""
        )
            .toLowerCase()
            .trim();
    }


    /******************************************************
     * ADMIN CHECK
     ******************************************************/

    function isCameraAdmin() {

        const role = String(
            localStorage.getItem("role") || ""
        )
            .toLowerCase()
            .trim();

        return (
            role === "admin" ||
            role === "super admin" ||
            role === "superadmin"
        );
    }


    /******************************************************
     * CLEAN OLD HLS
     ******************************************************/

    function destroyCameraHls(cameraId) {

        if (cameraWatchdogs[cameraId]) {

    clearInterval(
        cameraWatchdogs[cameraId]
    );

    delete cameraWatchdogs[cameraId];
}

        if (!hlsInstances[cameraId]) {
            return;
        }

        try {

            hlsInstances[cameraId].destroy();

        }
        catch (error) {

            console.warn(
                "📷 Camera HLS cleanup:",
                cameraId,
                error
            );

        }

        delete hlsInstances[cameraId];
    }


    


    /******************************************************
     * GET FIREBASE CAMERA BASE URL
     ******************************************************/

     async function getCameraBaseUrl(branch) {
    
        /*
         * RASSON 4
         * Permanent Cloudflare Tunnel
         * Firestore URL ki zarurat nahi
         */
        if (branch === "rasson4") {
            return "https://rasson4.rassonsnookeracademy.dpdns.org";
        }


        if (
            !window.db ||
            !window.fs ||
            !window.fs.doc ||
            !window.fs.getDoc
        ) {
            throw new Error(
                "Firebase not ready"
            );
        }


        const cameraDocRef =
            window.fs.doc(
                window.db,
                "camera_config",
                branch
            );


        const cameraSnapshot =
            await window.fs.getDoc(
                cameraDocRef
            );


        if (!cameraSnapshot.exists()) {

            throw new Error(
                "Camera config not found: " +
                branch
            );

        }


        const cameraData =
            cameraSnapshot.data();


        if (!cameraData.url) {

            throw new Error(
                "Camera URL missing: " +
                branch
            );

        }


        /*
         * Last slash remove
         */
        return String(cameraData.url)
            .replace(/\/+$/, "");
    }


    /******************************************************
     * CREATE CAMERA CARD
     ******************************************************/

function createCameraCard(
    camera,
    streamUrl
) {

    const branch = getCameraBranch();

    const cardId =
        "cameraCard_" + camera.id;

    // Duplicate protection
    if (document.getElementById(cardId)) {
        return;
    }


    const videoId =
        "cameraVideo_" + camera.id;

    const fullscreenId =
        "cameraFullscreen_" + camera.id;


    const card =
        document.createElement("div");

    card.id = cardId;

    card.className =
        "rasson-camera-card";


    card.innerHTML = `

        <div class="rasson-camera-title">

            <div>
                <span
                    class="camera-live-dot"
                ></span>

                ${camera.title}
            </div>

            <span
                class="camera-live-text"
            >
                LIVE
            </span>

        </div>


        <div
            class="rasson-camera-video-wrap"
            id="${fullscreenId}"
        >

            <video
                id="${videoId}"
                class="rasson-camera-video"
                muted
                autoplay
                playsinline
            ></video>

            <div
                class="camera-fullscreen-hint"
            >
                CLICK FOR FULL SCREEN
            </div>

        </div>
    `;


    /**************************************************
     * RASSON 1
     **************************************************/

if (branch === "rasson1") {

    const tablesGrid =
        document.getElementById("tablesGrid");

    if (!tablesGrid) return;

    const tableCards =
        tablesGrid.querySelectorAll(".table-box");

    if (camera.id === "hall") {

        // Hall camera sab tables ke baad
        tablesGrid.appendChild(card);

    } else if (camera.id === "table34") {

        // Table 4 ke baad (Table 3 & 4 cover karta hai)
        if (tableCards.length >= 4) {
            tableCards[3].after(card);
        } else {
            tablesGrid.appendChild(card);
        }
    }
}

    /**************************************************
     * RASSON 4 CAMERA MAPPING
     **************************************************/

    else if (branch === "rasson4") {

        const tablesGrid =
            document.getElementById(
                "tablesGrid"
            );

        const roomsGrid =
            document.getElementById(
                "roomsGrid"
            );


        /*
         * TABLE 1 + TABLE 2
         * ke neeche
         */
        if (camera.id === "table1") {

            if (!tablesGrid) return;

            card.classList.add(
                "camera-table12"
            );

            const tableCards =
                tablesGrid.querySelectorAll(
                    ".table-box"
                );

            if (tableCards.length >= 2) {

                tableCards[1].after(card);

            } else {

                tablesGrid.appendChild(card);

            }
        }


        /*
         * TABLE 3 + TABLE 4 + TABLE 5
         * ke neeche
         */
        else if (
            camera.id === "table345"
        ) {

            if (!tablesGrid) return;

            card.classList.add(
                "camera-table345"
            );

            const tableCards =
                tablesGrid.querySelectorAll(
                    ".table-box"
                );

            if (tableCards.length >= 5) {

                tableCards[4].after(card);

            } else {

                tablesGrid.appendChild(card);

            }
        }


        /*
         * ROOM 1 / ROOM 2 / ROOM 3
         */
        else if (
            camera.id === "room1" ||
            camera.id === "room2" ||
            camera.id === "room3"
        ) {

            if (!roomsGrid) return;

            card.classList.add(
                "camera-room"
            );

            const roomNumber =
                Number(
                    camera.id.replace(
                        "room",
                        ""
                    )
                );

            const roomCards =
                roomsGrid.querySelectorAll(
                    ".table-box"
                );


            const targetRoom =
                roomCards[
                    roomNumber - 1
                ];


            if (targetRoom) {

                targetRoom.after(card);

            } else {

                roomsGrid.appendChild(card);

            }
        }

    }


    /*
     * Camera start
     */
    startCamera(
        camera.id,
        videoId,
        streamUrl
    );


    bindCameraFullscreen(
        fullscreenId
    );
}

    /******************************************************
     * START CAMERA HLS
     ******************************************************/

    function startCamera(
        cameraId,
        videoId,
        streamUrl
    ) {

        const video =
            document.getElementById(
                videoId
            );


        if (!video) {
            return;
        }


        destroyCameraHls(cameraId);


        /*
         * Chrome / Edge
         */
        if (
            window.Hls &&
            Hls.isSupported()
        ) {

const hls =
    new Hls({

        // Mobile / external internet ke liye
        // thora safe live buffer
        liveSyncDurationCount: 5,
        liveMaxLatencyDurationCount: 10,
        
        maxBufferLength: 20,
        maxMaxBufferLength: 30,

        maxLiveSyncPlaybackRate: 1.2,

        backBufferLength: 5,

        // Slow/mobile network par fragments ko
        // jaldi fail na karo
        fragLoadingTimeOut: 20000,
        manifestLoadingTimeOut: 20000,

        // Network retry
        fragLoadingMaxRetry: 6,
        manifestLoadingMaxRetry: 6,

        enableWorker: true

    });

            hlsInstances[cameraId] = hls;


            hls.loadSource(
                streamUrl
            );


            hls.attachMedia(
                video
            );


        hls.on(
            Hls.Events.MANIFEST_PARSED,
            () => {
        
                /*
                 * Start hamesha latest available
                 * live edge ke qareeb se.
                 */
                if (
                    video.seekable &&
                    video.seekable.length > 0
                ) {
        
                    const liveEdge =
                        video.seekable.end(
                            video.seekable.length - 1
                        );
        
                    if (Number.isFinite(liveEdge)) {
        
                        video.currentTime =
                            Math.max(
                                0,
                                liveEdge - 1
                            );
                    }
                }
        
        
                video
                    .play()
                    .catch(() => {});
        
            }
        );



        /*
 * LIVE EDGE WATCHDOG
 *
 * Agar browser kisi wajah se live stream se
 * bohat peeche chala jaye to automatically
 * latest edge par jump kare.
 */
cameraWatchdogs[cameraId] =
    setInterval(
        () => {

            if (
                !video ||
                !video.seekable ||
                video.seekable.length === 0
            ) {
                return;
            }


            const liveEdge =
                video.seekable.end(
                    video.seekable.length - 1
                );


            const delay =
                liveEdge -
                video.currentTime;


            /*
             * 6 seconds se zyada peeche
             * hone nahi dena.
             */
            if (
                Number.isFinite(delay) &&
                delay > 6
            ) {

                console.warn(
                    "📷 Camera behind live edge:",
                    cameraId,
                    delay.toFixed(1),
                    "seconds"
                );


                video.currentTime =
                    Math.max(
                        0,
                        liveEdge - 1
                    );
            }

        },
        3000
    );
            


            

            hls.on(
                Hls.Events.ERROR,
                (event, data) => {

                    console.warn(
                        "📷 Camera HLS:",
                        cameraId,
                        data
                    );


/*
 * NON-FATAL STALL RECOVERY
 *
 * Camera low-buffer ki wajah se ruk jaye
 * to refresh ki zarurat na pade.
 */
if (!data.fatal) {

    /*
     * Small buffer stalls ko HLS.js
     * khud recover karne do.
     *
     * Har stall par seek karne se
     * 1-2 second repeat/jump hota tha.
     */
    if (
        data.details ===
        Hls.ErrorDetails.BUFFER_STALLED_ERROR
    ) {

        video
            .play()
            .catch(() => {});

    }

    return;
}

                    switch (data.type) {

                        case Hls.ErrorTypes.NETWORK_ERROR:

                            console.log(
                                "📷 Network retry:",
                                cameraId
                            );

                            hls.startLoad();

                            break;


                        case Hls.ErrorTypes.MEDIA_ERROR:

                            console.log(
                                "📷 Media recovery:",
                                cameraId
                            );

                            hls.recoverMediaError();

                            break;


                        default:

                            console.log(
                                "📷 Camera restart:",
                                cameraId
                            );


                            destroyCameraHls(
                                cameraId
                            );


                            setTimeout(
                                () => {

                                    startCamera(
                                        cameraId,
                                        videoId,
                                        streamUrl
                                    );

                                },
                                3000
                            );

                            break;
                    }

                }
            );

        }


        /*
         * Safari native HLS
         */
        else if (
            video.canPlayType(
                "application/vnd.apple.mpegurl"
            )
        ) {

            video.src = streamUrl;

            video
                .play()
                .catch(() => {});

        }


        else {

            console.error(
                "❌ HLS playback not supported:",
                cameraId
            );

        }
    }


    /******************************************************
     * FULLSCREEN
     ******************************************************/

    function bindCameraFullscreen(
        fullscreenId
    ) {

        const wrapper =
            document.getElementById(
                fullscreenId
            );


        if (!wrapper) {
            return;
        }


        wrapper.addEventListener(
            "click",
            async () => {

                try {

                    if (
                        document.fullscreenElement
                    ) {

                        await document
                            .exitFullscreen();

                        return;
                    }


                    if (
                        wrapper.requestFullscreen
                    ) {

                        await wrapper
                            .requestFullscreen();

                    }

                    else if (
                        wrapper.webkitRequestFullscreen
                    ) {

                        wrapper
                            .webkitRequestFullscreen();

                    }

                }
                catch (error) {

                    console.error(
                        "Camera fullscreen error:",
                        error
                    );

                }

            }
        );
    }


    /******************************************************
     * RENDER CAMERAS
     ******************************************************/

    async function renderCameras() {

        /*
         * Prevent overlapping async renders
         */
        if (renderInProgress) {
            return;
        }


        renderInProgress = true;


        try {

            const branch =
                getCameraBranch();


            /*
             * Admin only
             */
            if (!isCameraAdmin()) {
                return;
            }


            /*
             * Sirf configured branches
             */
            const cameras =
                CAMERA_CONFIG[branch];


            if (
                !cameras ||
                !cameras.length
            ) {
                return;
            }


            const tablesGrid =
                document.getElementById(
                    "tablesGrid"
                );


            if (!tablesGrid) {
                return;
            }


            /*
             * Firestore se branch ka
             * current Cloudflare URL
             */
            const baseUrl =
                await getCameraBaseUrl(
                    branch
                );


            console.log(
                "📷 Camera Base URL:",
                branch,
                baseUrl
            );


            /*
             * Branch ke saare cameras
             */
            cameras.forEach(
                camera => {

                    const streamUrl =
                        baseUrl +
                        camera.path;


                    console.log(
                        "📷 Camera Stream:",
                        camera.id,
                        streamUrl
                    );


                    createCameraCard(
                        camera,
                        streamUrl
                    );

                }
            );

        }
        catch (error) {

            console.error(
                "❌ Camera render failed:",
                error
            );

        }
        finally {

            renderInProgress = false;

        }
    }


    /******************************************************
     * WATCH TABLES.JS RENDER
     ******************************************************/

/******************************************************
 * WATCH TABLES.JS RENDER - STABLE FINAL
 ******************************************************/

function watchTablesRender() {

    const container =
        document.getElementById(
            "tablesContainer"
        );

    if (!container) {

        setTimeout(
            watchTablesRender,
            500
        );

        return;
    }


    const observer =
        new MutationObserver(
            () => {

                clearTimeout(
                    window
                        ._cameraRenderTimer
                );


                window._cameraRenderTimer =
                    setTimeout(
                        () => {

                            renderCameras();

                        },
                        150
                    );

            }
        );


    observer.observe(
        container,
        {
            childList: true,
            subtree: true
        }
    );


    /*
     * Initial render
     */
    renderCameras();
}


    /******************************************************
     * PAGE LOAD
     ******************************************************/

    document.addEventListener(
        "DOMContentLoaded",
        () => {

            watchTablesRender();

        }
    );

})();
