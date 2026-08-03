/******************************************************
 * RASSON CAMERA SYSTEM
 * Separate from Tables / Billing / Timer logic
 ******************************************************/

(() => {

    const CAMERA_CONFIG = {

rasson1: {
    hall: {
        title: "HALL CAMERA"
    }
}

    };


    let hallHls = null;


    /******************************************************
     * GET CURRENT BRANCH
     ******************************************************/

    function getCameraBranch() {

        // Existing software BRANCH variable
        if (
            typeof BRANCH !== "undefined" &&
            BRANCH
        ) {
            return String(BRANCH).toLowerCase();
        }

        // Fallback
        return String(
            localStorage.getItem("branch") || ""
        ).toLowerCase();
    }


    /******************************************************
     * CREATE HALL CAMERA CARD
     ******************************************************/

async function renderHallCamera() {

        const branch = getCameraBranch();

        // Camera abhi sirf Rasson1 ke liye
        if (branch !== "rasson1") {
            return;
        }


        const config =
            CAMERA_CONFIG.rasson1.hall;

let streamUrl = "";

try {

    if (!window.db || !window.fs) {
        throw new Error("Firebase not ready");
    }

    const cameraDocRef =
        window.fs.doc(
            window.db,
            "camera_config",
            "rasson1"
        );

    const cameraSnapshot =
        await window.fs.getDoc(cameraDocRef);

    if (!cameraSnapshot.exists()) {
        throw new Error(
            "Camera config document not found"
        );
    }

    const cameraData =
        cameraSnapshot.data();

    if (!cameraData.url) {
        throw new Error(
            "Camera URL missing"
        );
    }

    streamUrl =
        cameraData.url +
        "/hall/stream.m3u8";

    console.log(
        "📷 Camera Stream:",
        streamUrl
    );

}
catch (error) {

    console.error(
        "❌ Camera URL load failed:",
        error
    );

    return;
}


        const tablesGrid =
            document.getElementById("tablesGrid");


        // tables.js ne grid abhi create nahi ki
        if (!tablesGrid) {
            return;
        }


        // Duplicate protection
        if (
            document.getElementById("hallCameraCard")
        ) {
            return;
        }


        const card =
            document.createElement("div");


        card.id = "hallCameraCard";
        card.className = "rasson-camera-card";


        card.innerHTML = `

            <div class="rasson-camera-title">

                <div>
                    <span class="camera-live-dot"></span>
                    ${config.title}
                </div>

                <span class="camera-live-text">
                    LIVE
                </span>

            </div>


            <div
                class="rasson-camera-video-wrap"
                id="hallCameraFullscreen"
            >

                <video
                    id="hallCameraVideo"
                    class="rasson-camera-video"
                    muted
                    autoplay
                    playsinline
                ></video>


                <div class="camera-fullscreen-hint">
                    CLICK FOR FULL SCREEN
                </div>

            </div>

        `;


        /*
         * IMPORTANT:
         * tablesGrid ke andar append kar rahe hain.
         *
         * Is wajah se camera existing Table cards ke
         * same CSS grid system ko follow karega.
         */
        tablesGrid.appendChild(card);


        startHallCamera(streamUrl);
        bindHallFullscreen();
    }


    /******************************************************
     * START HLS STREAM
     ******************************************************/

    function startHallCamera(streamUrl) {

        const video =
            document.getElementById(
                "hallCameraVideo"
            );


        if (!video) return;


        // Old HLS instance clean
        if (hallHls) {

            try {
                hallHls.destroy();
            }
            catch (error) {
                console.warn(
                    "Camera HLS cleanup:",
                    error
                );
            }

            hallHls = null;
        }


        // Chrome / Edge
        if (
            window.Hls &&
            Hls.isSupported()
        ) {

            hallHls = new Hls({

                liveSyncDurationCount: 2,

                liveMaxLatencyDurationCount: 5,

                enableWorker: true

            });


            hallHls.loadSource(streamUrl);

            hallHls.attachMedia(video);


            hallHls.on(
                Hls.Events.MANIFEST_PARSED,
                () => {

                    video
                        .play()
                        .catch(() => {});

                }
            );


            hallHls.on(
                Hls.Events.ERROR,
                (event, data) => {

                    console.warn(
                        "📷 Hall Camera HLS:",
                        data
                    );


                    if (!data.fatal) {
                        return;
                    }


                    switch (data.type) {

                        case Hls.ErrorTypes.NETWORK_ERROR:

                            console.log(
                                "📷 Camera network retry..."
                            );

                            hallHls.startLoad();

                            break;


                        case Hls.ErrorTypes.MEDIA_ERROR:

                            console.log(
                                "📷 Camera media recovery..."
                            );

                            hallHls.recoverMediaError();

                            break;


                        default:

                            console.log(
                                "📷 Camera restart required"
                            );

                            hallHls.destroy();
                            hallHls = null;

                            setTimeout(() => {
                                startHallCamera(
                                    streamUrl
                                );
                            }, 3000);

                            break;
                    }

                }
            );

        }


        // Safari / native HLS fallback
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
                "❌ HLS playback not supported."
            );

        }
    }


    /******************************************************
     * FULLSCREEN
     ******************************************************/

    function bindHallFullscreen() {

        const wrapper =
            document.getElementById(
                "hallCameraFullscreen"
            );


        if (!wrapper) return;


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
     * WATCH TABLES.JS RENDER
     *
     * renderTables() box.innerHTML="" karta hai,
     * isliye camera card remove ho sakta hai.
     *
     * MutationObserver usko automatically dobara
     * add karega without changing tables.js.
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
            new MutationObserver(() => {

                clearTimeout(
                    window._hallCameraRenderTimer
                );


                window._hallCameraRenderTimer =
                    setTimeout(() => {

                        renderHallCamera();

                    }, 150);

            });


        observer.observe(
            container,
            {
                childList: true,
                subtree: true
            }
        );


        // Initial attempt
        renderHallCamera();
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
