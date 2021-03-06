var DEGREE_TO_RAD = Math.PI / 180;

/**
 * XMLscene class, representing the scene that is to be rendered.
 */
class XMLscene extends CGFscene {
    /**
     * @constructor
     * @param {MyInterface} myinterface 
     */
    constructor(myinterface) {
        super();

        this.interface = myinterface;
    }

    /**
     * Initializes the scene, setting some WebGL defaults, initializing the camera and the axis.
     * @param {CGFApplication} application
     */
    init(application) {
        super.init(application);
        this.initialTime = 0;
        this.sceneInited = false;
        this.camera = new CGFcamera(0.4, 0.1, 500, vec3.fromValues(15, 15, 15), vec3.fromValues(0, 0, 0));
        this.cameraIDs = [];
        this.currentCamera = null;;
        this.lightIDs = new Object();

        this.enableTextures(true);

        this.RTT = new CGFtextureRTT(this, window.innerWidth, window.innerHeight);
        this.securityCamera = new MySecurityCamera(this, this.RTT);
        this.cameraForSecurity = new CGFcamera(0.4, 0.1, 500, vec3.fromValues(-20, 10, -20), vec3.fromValues(0, 0, 0));        


        this.gl.clearDepth(100.0);
        this.gl.enable(this.gl.DEPTH_TEST);
        this.gl.enable(this.gl.CULL_FACE);
        this.gl.depthFunc(this.gl.LEQUAL);

        this.axis = new CGFaxis(this);
        this.axisIsActive = true;

        this.appearance = new CGFappearance(this);
        
        this.setUpdatePeriod(100);
    }

    update(t){
        if(this.sceneInited)
            this.graph.updateAnimations(t - this.initialTime);
        else{
            this.initialTime = t;
            this.graph.updateInitialTimeAnimations(this.initialTime);
        } 

        this.securityCamera.update(t);
    }

    /**
     * Initializes the scene cameras.
     */
    initCameras() {
        //In case there is an error with the XML File
        let currentCamera = this.graph.views[this.graph.defaultCamera];
        //Choose the camera with the appropriate default ID in case it exists.
       this.camera = currentCamera;

        this.interface.setActiveCamera(this.camera);
    }


    updateCamera(newCamera){
        this.currentCamera = newCamera;

        this.interface.setActiveCamera(this.camera);
      }
   
    /**
     * Initializes the scene lights with the values read from the XML file.
     */
    initLights() {
        var i = 0;
        // Lights index.

        // Reads the lights from the scene graph.
        for (var key in this.graph.lights) {
            if (i >= 8)
                break;              // Only eight lights allowed by WebGL.
            this.lightIDs[key] = i;
            if (this.graph.lights.hasOwnProperty(key)) {
                var light = this.graph.lights[key];

                this.lights[i].setPosition(light[2][0], light[2][1], light[2][2], light[2][3]);
                this.lights[i].setAmbient(light[3][0], light[3][1], light[3][2], light[3][3]);
                this.lights[i].setDiffuse(light[4][0], light[4][1], light[4][2], light[4][3]);
                this.lights[i].setSpecular(light[5][0], light[5][1], light[5][2], light[5][3]);

                if (light[1] == "spot") {
                    this.lights[i].setSpotCutOff(light[6]);
                    this.lights[i].setSpotExponent(light[7]);
                    this.lights[i].setSpotDirection(light[8][0], light[8][1], light[8][2]);
                }

                this.lights[i].setVisible(true);
                if (light[0])
                    this.lights[i].enable();
                else
                    this.lights[i].disable();

                this.lights[i].update();

                i++;
            }
        }
    }

    updateLights(){
        var i = 0;
        // Lights index.

        // Reads the lights from the scene graph.
        for (var key in this.graph.lights) {
            if (i >= 8)
                break;              // Only eight lights allowed by WebGL.
            this.lightIDs[key] = i;
            if (this.graph.lights.hasOwnProperty(key)) {
                var light = this.graph.lights[key];

                if (light[0])
                    this.lights[i].enable();
                else
                    this.lights[i].disable();

                this.lights[i].update();

                i++;
            }
        }
    }

    setDefaultAppearance() {
        this.setAmbient(0.2, 0.4, 0.8, 1.0);
        this.setDiffuse(0.2, 0.4, 0.8, 1.0);
        this.setSpecular(0.2, 0.4, 0.8, 1.0);
        this.setShininess(10.0);
    }
    /** Handler called when the graph is finally loaded. 
     * As loading is asynchronous, this may be called already after the application has started the run loop
     */
    onGraphLoaded() {

        //this.updateCamera(this.graph.default);

        this.axis = new CGFaxis(this, this.graph.referenceLength);

        this.gl.clearColor(this.graph.background[0], this.graph.background[1], this.graph.background[2], this.graph.background[3]);

        this.setGlobalAmbientLight(this.graph.ambient[0], this.graph.ambient[1], this.graph.ambient[2], this.graph.ambient[3]);

        //Comentar init Cameras
        this.initCameras();
        this.initLights();

        this.sceneInited = true;

        this.interface.createMenus();
    }

    toggleAxis() {
		this.axisIsActive = !this.axisIsActive;
	}

    /**
     * Displays the scene.
     */
    display(){
        let previousCamera = this.camera;
        this.RTT.attachToFrameBuffer();
        this.render(this.cameraForSecurity);
        this.RTT.detachFromFrameBuffer();
        this.render(previousCamera);

        this.gl.disable(this.gl.DEPTH_TEST);
        this.securityCamera.display();
        this.gl.enable(this.gl.DEPTH_TEST);
    }

    render(Camera) {
        this.camera = Camera;
        this.interface.setActiveCamera(this.camera);

        // ---- BEGIN Background, camera and axis setup

        // Clear image and depth buffer everytime we update the scene
        this.gl.viewport(0, 0, this.gl.canvas.width, this.gl.canvas.height);
        this.gl.clear(this.gl.COLOR_BUFFER_BIT | this.gl.DEPTH_BUFFER_BIT);

        // Initialize Model-View matrix as identity (no transformation
        this.updateProjectionMatrix();
        this.loadIdentity();

        // Apply transformations corresponding to the camera position relative to the origin
        this.applyViewMatrix();

        this.pushMatrix();
        if(this.axisIsActive)
            this.axis.display();

        this.updateLights();

        if (this.sceneInited) {
            for (var i = 0; i < this.graph.lights.length; i++) {
                this.lights[i].setVisible(true);
                this.lights[i].enable();
            }

            // Draw axis
            this.setDefaultAppearance();

            // Displays the scene (MySceneGraph function).
            this.graph.displayScene();
        }

        this.popMatrix();
        // ---- END Background, camera and axis setup
    }
}