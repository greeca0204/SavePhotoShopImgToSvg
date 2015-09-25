﻿/*
 <javascriptresource>
 <name>Save as SVG</name>
 <about>Name a layer or layerset with .svg to convert it.</about>
 </javascriptresource>
 */


var svgWiz = svgWiz || {
    settings : {
        scriptName : 'svgexport',
        doc : app.activeDocument,
        projectPath : app.activeDocument.path,
        layers : app.activeDocument.layers,
        svgFile : null,
        svgColor : null,
        exportOpts : new ExportOptionsIllustrator(),
        currentLayer : null
    },
    getSettings : function(){
        return this.settings;
    },
    setSetting : function(key, val){
        return this.settings[key] = val;
    },
    
    getLayerFillColor : function(){
        var ref = new ActionReference();
            ref.putEnumerated( stringIDToTypeID( "contentLayer" ), charIDToTypeID( "Ordn" ), charIDToTypeID( "Trgt" ));
        var ref1= executeActionGet( ref );
        var list =  ref1.getList( charIDToTypeID( "Adjs" ) ) ;
        var solidColorLayer = list.getObjectValue(0);        
        var color = solidColorLayer.getObjectValue(charIDToTypeID('Clr ')); 
        var fillcolor = new SolidColor;
           fillcolor.rgb.red = color.getDouble(charIDToTypeID('Rd  '));
           fillcolor.rgb.green = color.getDouble(charIDToTypeID('Grn '));
           fillcolor.rgb.blue = color.getDouble(charIDToTypeID('Bl  '));

        this.setSetting('svgColor', fillcolor.rgb);
    },

    exportToIll : function(){
        var s = this.getSettings(),
            opts = s.exportOpts;

        // create svgFile
        var svgPath = s.projectPath + '/' + s.currentLayer.name + '.ai';
        this.setSetting('svgFile', new File(svgPath));

        opts.path = IllustratorPathType.NAMEDPATH;
        opts.pathName = s.currentLayer.name; // ** Adobe bug, this does not work, regardless of name it uses the doc.activeLayer
        s.doc.exportDocument(s.svgFile, ExportType.ILLUSTRATORPATHS, opts);
    },
    
    openWithBridgeTalk : function(){
        var s = this.getSettings();
        // start bridgeTalk to communicate with illustrator
        var bt = new BridgeTalk();

        bt.target = "illustrator";

        bt.body  = "var dtOpts = new OpenOptions();"; // create new object for opening options
        bt.body += "dtOpts.createArtboardWithArtworkBoundingBox = false;"; // pass parameter to object
        bt.body += "dtOpts.convertCropAreaToArboard = false;"; // pass parameter to object
        bt.body += "dtOpts.preserveLegacyArtboard = false;"; // pass parameter to object
        bt.body += "app.userInteractionLevel = UserInteractionLevel.DONTDISPLAYALERTS;"; // turn off dialogs so there are no interruptions in the script
        bt.body += "app.open(" + s.svgFile.toSource() + ", DocumentColorSpace.RGB, dtOpts);"; // open exported file from PS
        bt.body += "var mySelection = app.activeDocument.selectObjectsOnActiveArtboard();"; // need to select the path object
        bt.body += "var currentPath = app.activeDocument.selection[0].pathItems[0];"; // get current pathItem (the shape)
        bt.body += "var col = new RGBColor(); col.red = "+ s.svgColor.red +"; col.green = "+ s.svgColor.green +"; col.blue = "+ s.svgColor.blue+ ";"; // set new rgb color using values from PS
        bt.body += "currentPath.fillColor = col;";
        bt.body += "app.activeDocument.fitArtboardToSelectedArt(app.activeDocument.artboards.getActiveArtboardIndex());"; // object -> artboards -> fit to artwork bounds
        bt.body += "var destFolder = "+ s.projectPath.toSource() +";";
        bt.body += "var targetFile = new File( destFolder + '/' + "+ s.currentLayer.name.toSource() +");"; // name file from PS layer name
        bt.body += "app.activeDocument.exportFile(targetFile, ExportType.SVG);"; // save as svg
        bt.body += "app.activeDocument.close();"; // close file

        bt.send(); // submits BT
    },

    init : function(){
        var s = this.getSettings(),
            layers = s.layers;

        // check which layers to convert
        for(var i=0; i < layers.length; i++) {
            var layer = layers[i];
            if (layer.name.indexOf('.svg') !== -1) {
                // only works with vector layers
                if (layer.kind == 'LayerKind.SOLIDFILL'){
                    svgWiz.setSetting('currentLayer', layer);
                    s.doc.activeLayer = s.currentLayer; // make this the activelayer in the doc because of bug that won't let you export ill. paths by name
                    this.getLayerFillColor();
                    this.exportToIll();
                    this.openWithBridgeTalk();
                }
            }
        }
    }
};

svgWiz.init();