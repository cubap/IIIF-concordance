/*
 * To change this license header, choose License Headers in Project Properties.
 * To change this template file, choose Tools | Templates
 * and open the template in the editor.
 */
package edu.slu.tpen.servlet.util;

import java.io.UnsupportedEncodingException;
import java.net.URLEncoder;
import net.sf.json.JSONArray;
import net.sf.json.JSONObject;
import textdisplay.Folio;

/**
 *
 * @author hanyan
 */
public class CreateCanvasListUtil {
    public static JSONObject createEmptyCanvasList(String projectName, Integer projectID, String folioPageName) throws UnsupportedEncodingException{
        JSONObject canvasList = new JSONObject();
        canvasList.element("@type", "sc:AnnotationList");
        String canvasID = Folio.getRbTok("SERVERURL") + projectName + "/canvas/" + URLEncoder.encode(folioPageName, "UTF-8");
        canvasList.element("on", canvasID);
        canvasList.element("originalAnnoID", "");
        canvasList.element("version", 1);
        canvasList.element("permission", 0);
        canvasList.element("forkFromID", "");
        canvasList.element("resources", new JSONArray());
        canvasList.element("proj", projectID);
        canvasList.element("testing", "testing");
        return canvasList;
    }
}
