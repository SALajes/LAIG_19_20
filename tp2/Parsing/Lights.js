class Lights {
    constructor(scene) {
        this.graph = scene.graph;
    }
    getLights(children){
        var numLights = 0;

        var grandChildren = [];
        var nodeNames = [];

        // Any number of lights.
        for (var i = 0; i < children.length; i++) {

            // Storing light information
            var global = [];
            var attributeNames = [];
            var attributeTypes = [];

            //Check type of light
            if (children[i].nodeName != "omni" && children[i].nodeName != "spot") {
                this.graph.onXMLMinorError("unknown tag <" + children[i].nodeName + ">");
                continue;
            }
            else {
                attributeNames.push(...["location", "ambient", "diffuse", "specular"]);
                attributeTypes.push(...["position", "color", "color", "color"]);
            }

            // Get id of the current light.
            var lightId = this.graph.reader.getString(children[i], 'id');
            if (lightId == null)
                return "no ID defined for light";

            // Checks for repeated IDs.
            if (this.graph.lights[lightId] != null)
                return "ID must be unique for each light (conflict: ID = " + lightId + ")";

            // Light enable/disable
            var enableLight = true;
            var aux = this.graph.reader.getBoolean(children[i], 'enabled');
            if (!(aux != null && !isNaN(aux) && (aux == true || aux == false)))
                this.graph.onXMLMinorError("unable to parse value component of the 'enable light' field for ID = " + lightId + "; assuming 'value = 1'");

            enableLight = aux || 1;

            //Add enabled boolean and type name to light info
            global.push(enableLight);
            global.push(children[i].nodeName);

            grandChildren = children[i].children;
            // Specifications for the current light.

            nodeNames = [];
            for (var j = 0; j < grandChildren.length; j++) {
                nodeNames.push(grandChildren[j].nodeName);
            }

            for (var j = 0; j < attributeNames.length; j++) {
                var attributeIndex = nodeNames.indexOf(attributeNames[j]);

                if (attributeIndex != -1) {
                    if (attributeTypes[j] == "position")
                        var aux = this.graph.parseCoordinates4D(grandChildren[attributeIndex], "light position for ID" + lightId);
                    else if (attributeTypes[j] == "color")
                        var aux = this.graph.parseColor(grandChildren[attributeIndex], attributeNames[j] + " illumination for ID" + lightId);
                    
                    if (!Array.isArray(aux))
                        return aux;

                    global.push(aux);
                }
                else
                    return "light " + attributeNames[i] + " undefined for ID = " + lightId;
            }

            // Gets the additional attributes of the spot light
            if (children[i].nodeName == "spot") {
                var angle = this.graph.reader.getFloat(children[i], 'angle');
                if (!(angle != null && !isNaN(angle)))
                    return "unable to parse angle of the light for ID = " + lightId;

                var exponent = this.graph.reader.getFloat(children[i], 'exponent');
                if (!(exponent != null && !isNaN(exponent)))
                    return "unable to parse exponent of the light for ID = " + lightId;

                var targetIndex = nodeNames.indexOf("target");

                // Retrieves the light target.
                var targetLight = [];
                if (targetIndex != -1) {
                    var aux = this.graph.parseCoordinates3D(grandChildren[targetIndex], "target light for ID " + lightId);
                    if (!Array.isArray(aux))
                        return aux;

                    targetLight = aux;
                }
                else
                    return "light target undefined for ID = " + lightId;

                global.push(...[angle, exponent, targetLight])
            }
            //Attenuattion parsing

            let attenuation = nodeNames.indexOf('attenuation');
            if (attenuation == null) {
                return "Unable to get attenuation";     
            }
            
            //Constant parsing
            let constant = this.graph.reader.getFloat(grandChildren[attenuation],'constant');
            if (constant == null) {
                constant = 0;
                this.graph.onXMLMinorError( "Unable to parse constant attenuation, has now value 0");
            }

            //Linear parsing
            let linear = this.graph.reader.getFloat(grandChildren[attenuation],'linear');
            if (linear == null) {
                linear=1;
                this.graph.onXMLMinorError( "Unable to parse constant attenuation, has now value 0");
            }

            //quadratic parsing
            let quadratic = this.graph.reader.getFloat(grandChildren[attenuation],'quadratic');
            if (quadratic == null) {
                quadratic =0;
                this.graph.onXMLMinorError( "Unable to parse constant attenuation, has now value 0");
            }

            global.push(...[constant,linear,quadratic]);
            

            this.graph.lights[lightId] = global;
            numLights++;
        }

        if (numLights == 0)
            return "at least one light must be defined";
        else if (numLights > 8)
            this.graph.onXMLMinorError("too many lights defined; WebGL imposes a limit of 8 lights");
    }
}