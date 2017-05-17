/*
 * To change this license header, choose License Headers in Project Properties.
 * To change this template file, choose Tools | Templates
 * and open the template in the editor.
 */

package edu.slu.tpen.entity.Image;

import edu.slu.tpen.servlet.Constant;
import java.io.BufferedReader;
import java.io.DataOutputStream;
import java.io.IOException;
import java.io.InputStreamReader;
import java.net.HttpURLConnection;
import java.net.MalformedURLException;
import java.net.URL;
import java.net.URLEncoder;
import java.util.List;
import net.sf.json.JSONArray;
import net.sf.json.JSONObject;

/**
 *
 * @author hanyan
 */
public class Canvas {
    private String objectId;
    //for reference in the sc:AnnotationList
    private String id;
    private String type;
    private Integer height;
    private Integer width;
    private List<Image> ls_images;
    private List<OtherContent> ls_otherContent;

    public Canvas() {
    }

    public Canvas(String id, Integer height, Integer width, List<Image> ls_images, List<OtherContent> ls_otherContent) {
        this.id = id;
        this.height = height;
        this.width = width;
        this.ls_images = ls_images;
        this.ls_otherContent = ls_otherContent;
    }
    
    public JSONObject toJSON(){
        JSONObject jo = new JSONObject();
        jo.element("@id", this.id);
        jo.element("@type", this.type);
        jo.element("height", this.height);
        jo.element("width", this.width);
        JSONArray ja_images = new JSONArray();
        for(Image i : ls_images){
            ja_images.add(i.toJSON());
        }
        jo.element("images", ja_images);
        JSONArray ja_otherContent = new JSONArray();
        for(OtherContent oc : ls_otherContent){
            ja_otherContent.add(oc.toJSON());
        }
        jo.element("otherContent", ja_otherContent);
        return jo;
    }

    /**
     * @return the id
     */
    public String getId() {
        return id;
    }

    /**
     * @param id the id to set
     */
    public void setId(String id) {
        this.id = id;
    }

    /**
     * @return the type
     */
    public String getType() {
        return type;
    }

    /**
     * @param type the type to set
     */
    public void setType(String type) {
        this.type = type;
    }

    /**
     * @return the height
     */
    public Integer getHeight() {
        return height;
    }

    /**
     * @param height the height to set
     */
    public void setHeight(Integer height) {
        this.height = height;
    }

    /**
     * @return the width
     */
    public Integer getWidth() {
        return width;
    }

    /**
     * @param width the width to set
     */
    public void setWidth(Integer width) {
        this.width = width;
    }

    /**
     * @return the ls_images
     */
    public List<Image> getLs_images() {
        return ls_images;
    }

    /**
     * @param ls_images the ls_images to set
     */
    public void setLs_images(List<Image> ls_images) {
        this.ls_images = ls_images;
    }

    /**
     * @return the ls_otherContent
     */
    public List<OtherContent> getLs_otherContent() {
        return ls_otherContent;
    }

    /**
     * @param ls_otherContent the ls_otherContent to set
     */
    public void setLs_otherContent(List<OtherContent> ls_otherContent) {
        this.ls_otherContent = ls_otherContent;
    }
    
    /**
     * Check the annotation store for the annotation list on this canvas for this project.
     * @param projectID : the projectID the canvas belongs to
     * @param canvasID: The canvas ID the annotation list is on
     * @param UID: The current UID of the user in session.
     * @return : The annotation lists @id property, not the object.  Meant to look like an otherContent field.
     */
    public static JSONArray getAnnotationListsForProject(Integer projectID, String canvasID, Integer UID) throws MalformedURLException, IOException {
        URL postUrl = new URL(Constant.ANNOTATION_SERVER_ADDR + "/anno/getAnnotationByProperties.action");
        JSONObject parameter = new JSONObject();
        parameter.element("@type", "sc:AnnotationList");
        //have to rememeber that proj:"master" may exist
//        if(projectID > -1){
//            parameter.element("proj", projectID);
//        }
        parameter.element("on", canvasID);
        System.out.println("Lists on "+canvasID);
        //System.out.println("Get anno list for proj "+projectID+" on canvas "+canvasID);
        HttpURLConnection connection = (HttpURLConnection) postUrl.openConnection();
        connection.setDoOutput(true);
        connection.setDoInput(true);
        connection.setRequestMethod("POST");
        connection.setUseCaches(false);
        connection.setInstanceFollowRedirects(true);
        connection.setRequestProperty("Content-Type", "application/x-www-form-urlencoded");
        connection.connect();
        DataOutputStream out = new DataOutputStream(connection.getOutputStream());
        //value to save
        out.writeBytes("content=" + URLEncoder.encode(parameter.toString(), "utf-8"));
        out.flush();
        out.close(); // flush and close
        BufferedReader reader = new BufferedReader(new InputStreamReader(connection.getInputStream(),"utf-8"));
        String line="";
        StringBuilder sb = new StringBuilder();
        while ((line = reader.readLine()) != null){
            line = new String(line.getBytes(), "utf-8");
            sb.append(line);
        }
        reader.close();
        connection.disconnect();
        //FIXME: Every now and then, this line throws an error: A JSONArray text must start with '[' at character 1 of &lt
        String jarray = sb.toString();
        jarray = jarray.trim();
        JSONArray theLists = JSONArray.fromObject(jarray);
        JSONArray listsToReturn = new JSONArray();
        JSONObject masterList = new JSONObject();
        for(int j=0; j<theLists.size(); j++){
            JSONObject listToCheck = theLists.getJSONObject(j);
            if(listToCheck.has("proj") && listToCheck.getInt("proj") == projectID){
                listsToReturn.add(listToCheck);
            }
            if(listToCheck.has("proj") && listToCheck.get("proj") == "master"){
                masterList = listToCheck;
            }
        }
        //This will ensure we only return the master list if there are no other lists that match the project ID.
        if(listsToReturn.isEmpty() && masterList.size() > 0){
            listsToReturn.add(masterList);
        }
        //System.out.println("Found "+theLists.size()+" lists matching those params.");
//        String[] annotationLists = new String[theLists.size()];
//        for(int i=0; i<theLists.size(); i++){
//            JSONObject currentList = theLists.getJSONObject(i);
//            String id = currentList.getString("@id");
//           // System.out.println("List ID: "+id);
//            annotationLists[i] = id;
//        }
        //System.out.println("Return this array");
        //System.out.println(Arrays.toString(annotationLists));
        System.out.println("How many anno lists? "+listsToReturn.size());
        return listsToReturn;
    }
    
}
