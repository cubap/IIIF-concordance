/*
 * Copyright 2014- Saint Louis University. Licensed under the
 *	Educational Community License, Version 2.0 (the "License"); you may
 * not use this file except in compliance with the License. You may
 * obtain a copy of the License at
 *
 * http://www.osedu.org/licenses/ECL-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an "AS IS"
 * BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express
 * or implied. See the License for the specific language governing
 * permissions and limitations under the License.
 */
package edu.slu.tpen.servlet;

import edu.slu.tpen.servlet.util.CreateAnnoListUtil;
import edu.slu.util.ServletUtils;
import java.io.BufferedReader;
import java.io.DataOutputStream;
import java.io.IOException;
import java.io.InputStreamReader;
import java.net.HttpURLConnection;
import java.net.URL;
import java.net.URLEncoder;
import java.sql.Connection;
import java.util.Iterator;
import java.util.Set;
import javax.servlet.ServletException;
import javax.servlet.http.HttpServlet;
import javax.servlet.http.HttpServletRequest;
import javax.servlet.http.HttpServletResponse;
import net.sf.json.JSONArray;
import net.sf.json.JSONObject;
import textdisplay.Folio;
import textdisplay.PartnerProject;
import textdisplay.Project;

/**
 * Copy project from a template project(or called standard project) which is created by NewBerry. 
 * Clear all transcription data from project and connect the new project 
 * to the template project on switch board. 
 * @author hanyan
 */
public class CopyProjWithAnnoServlet extends HttpServlet {
    
    @Override
    /**
     * @param projectID
     * @param uID
     */
    protected void doPost(HttpServletRequest request, HttpServletResponse response) throws ServletException, IOException {
        int result = 0;
        if(null != request.getParameter("projectID")){
            Integer projectID = Integer.parseInt(request.getParameter("projectID"));
            if(null != request.getParameter("uID")){
                Integer uID = Integer.parseInt(request.getParameter("uID"));
                try {
                    //find original project and copy to a new project. 
                    Project templateProject = new Project(projectID);
                    Connection conn = ServletUtils.getDBConnection();
                    conn.setAutoCommit(false);
                    //in this method, it copies everything about the project.
                    if(null != templateProject.getProjectName())
                    {
                        Project thisProject = new Project(templateProject.copyProjectWithoutTranscription(conn, uID));
                        //set partener project. It is to make a connection on switch board. 
                        thisProject.setAssociatedPartnerProject(projectID);
                        PartnerProject theTemplate = new PartnerProject(projectID);
                        thisProject.copyButtonsFromProject(conn, theTemplate.getTemplateProject());
                        thisProject.copyHotkeysFromProject(conn, theTemplate.getTemplateProject());
                        conn.commit();
                        Folio[] folios = thisProject.getFolios();
                        if(null != folios && folios.length > 0)
                        {
                            for(int i = 0; i < folios.length; i++)
                            {
                                Folio folio = folios[i];
                                //get annotation list for each canvas
                                JSONObject annoLsQuery = new JSONObject();
                                annoLsQuery.element("@type", "sc:AnnotationList");
                                annoLsQuery.element("proj", templateProject.getProjectID());
                                annoLsQuery.element("on", Folio.getRbTok("SERVERURL") + templateProject.getProjectName() + "/canvas/" + URLEncoder.encode(folio.getPageName(), "UTF-8"));
System.out.println("on: " + Folio.getRbTok("SERVERURL") + templateProject.getProjectName() + "/canvas/" + URLEncoder.encode(folio.getPageName(), "UTF-8"));
                                URL postUrlannoLs = new URL(Constant.ANNOTATION_SERVER_ADDR + "/anno/getAnnotationByProperties.action");
                                HttpURLConnection ucAnnoLs = (HttpURLConnection) postUrlannoLs.openConnection();
                                ucAnnoLs.setDoInput(true);
                                ucAnnoLs.setDoOutput(true);
                                ucAnnoLs.setRequestMethod("POST");
                                ucAnnoLs.setUseCaches(false);
                                ucAnnoLs.setInstanceFollowRedirects(true);
                                ucAnnoLs.addRequestProperty("content-type", "application/x-www-form-urlencoded");
                                ucAnnoLs.connect();
                                DataOutputStream dataOutAnnoLs = new DataOutputStream(ucAnnoLs.getOutputStream());
                                dataOutAnnoLs.writeBytes("content=" + URLEncoder.encode(annoLsQuery.toString(), "utf-8"));
                                dataOutAnnoLs.flush();
                                dataOutAnnoLs.close();
                                BufferedReader readerAnnoLs = new BufferedReader(new InputStreamReader(ucAnnoLs.getInputStream(),"utf-8"));
                                String lineAnnoLs = "";
                                StringBuilder sbAnnoLs = new StringBuilder();
//                                System.out.println("=============================");  
//                                System.out.println("Contents of annotation list starts");  
//                                System.out.println("=============================");  
                                while ((lineAnnoLs = readerAnnoLs.readLine()) != null){
//                                    System.out.println(lineAnnoLs);
                                    sbAnnoLs.append(lineAnnoLs);
                                }
//                                System.out.println("=============================");  
//                                System.out.println("Contents of annotation list ends");  
//                                System.out.println("=============================");
                                readerAnnoLs.close();
                                ucAnnoLs.disconnect();
                                JSONArray ja_annotationList = JSONArray.fromObject(sbAnnoLs.toString());
                                if(ja_annotationList.size() > 0)
                                {
                                    for(int m = 0; m < ja_annotationList.size(); m++)
                                    {
                                        JSONObject annoList = ja_annotationList.getJSONObject(m);
                                        JSONArray resources = annoList.getJSONArray("resources");
                                        //grab annotation list from each canvas list and copy them
                                        for(int n = 0; n < resources.size(); n++)
                                        {
                                            JSONObject resource = resources.getJSONObject(n);
                                            //print json element of annotation list starts
    //                                        System.out.println(annoInList.keySet().size());
    //                                        System.out.println("content of template anno in anno list starts: ");
                                            //loop through resource 
    //                                        System.out.println("content of template anno in anno list starts: ");
                                            //print json element of annotation list ends
                                            //get each annotation in annotation list
                                            JSONObject annoQuery = new JSONObject();
                                            System.out.println("@id ==== " + resource.get("@id"));
                                            annoQuery.element("@id", resource.get("@id"));
                                            URL postGetAnnoByAID = new URL(Constant.ANNOTATION_SERVER_ADDR + "/anno/getAnnotationByProperties.action");
                                            HttpURLConnection ucGetAnnoByAID = (HttpURLConnection) postGetAnnoByAID.openConnection();
                                            ucGetAnnoByAID.setDoInput(true);
                                            ucGetAnnoByAID.setDoOutput(true);
                                            ucGetAnnoByAID.setRequestMethod("POST");
                                            ucGetAnnoByAID.setUseCaches(false);
                                            ucGetAnnoByAID.setInstanceFollowRedirects(true);
                                            ucGetAnnoByAID.addRequestProperty("content-type", "application/x-www-form-urlencoded");
                                            ucGetAnnoByAID.connect();
                                            DataOutputStream dataOutGetAnnoByAID = new DataOutputStream(ucGetAnnoByAID.getOutputStream());
                                            dataOutGetAnnoByAID.writeBytes("content=" + URLEncoder.encode(annoQuery.toString(), "utf-8"));
                                            dataOutGetAnnoByAID.flush();
                                            dataOutGetAnnoByAID.close();
                                            BufferedReader readerGetAnnoByAID = new BufferedReader(new InputStreamReader(ucGetAnnoByAID.getInputStream(), "utf-8"));
                                            StringBuilder sbGetAnnoByAID = new StringBuilder();
                                            String lineGetAnnoByAID = "";
    //                                        System.out.println("content of template anno starts: ");
                                            while((lineGetAnnoByAID = readerGetAnnoByAID.readLine()) != null){
    //                                            System.out.println(lineGetAnnoByAID);
                                                sbGetAnnoByAID.append(lineGetAnnoByAID);
                                            }
    //                                        System.out.println("content of template anno ends: ");
                                            readerGetAnnoByAID.close();
                                            ucGetAnnoByAID.disconnect();
    //                                        System.out.println("first char of json object ===" + sbGetAnnoByAID.toString().charAt(0) + "===");
                                            JSONObject anno = JSONArray.fromObject(sbGetAnnoByAID.toString()).getJSONObject(0);
                                            anno.remove("_id");
                                            anno.remove("@id");
                                            //copy annotation
                                            URL postUrlCopyAnno = new URL(Constant.ANNOTATION_SERVER_ADDR + "/anno/saveNewAnnotation.action");
                                            HttpURLConnection ucCopyAnno = (HttpURLConnection) postUrlCopyAnno.openConnection();
                                            ucCopyAnno.setDoInput(true);
                                            ucCopyAnno.setDoOutput(true);
                                            ucCopyAnno.setRequestMethod("POST");
                                            ucCopyAnno.setUseCaches(false);
                                            ucCopyAnno.setInstanceFollowRedirects(true);
                                            ucCopyAnno.addRequestProperty("content-type", "application/x-www-form-urlencoded");
                                            ucCopyAnno.connect();
                                            DataOutputStream dataOutCopyAnno = new DataOutputStream(ucCopyAnno.getOutputStream());
                                            dataOutCopyAnno.writeBytes("content=" + URLEncoder.encode(anno.toString(), "utf-8"));
                                            dataOutCopyAnno.flush();
                                            dataOutCopyAnno.close();
                                            BufferedReader readerCopyAnno = new BufferedReader(new InputStreamReader(ucCopyAnno.getInputStream(), "utf-8"));
                                            StringBuilder sbCopyAnno = new StringBuilder();
                                            String lineCopyAnno = "";
    //                                        System.out.println("content of copied anno starts: ");
                                            while((lineCopyAnno = readerCopyAnno.readLine()) != null){
    //                                            System.out.println(lineCopyAnno);
                                                sbCopyAnno.append(lineCopyAnno);
                                            }
    //                                        System.out.println("content of copied anno endss: ");
                                            readerCopyAnno.close();
                                            ucCopyAnno.disconnect();
                                            JSONObject copyAnnoReturnVal = JSONObject.fromObject(sbCopyAnno.toString());
                                            String copyAnnoNewAID = copyAnnoReturnVal.getString("@id");
                                            result++;
                                            resource.remove("@id");
                                            resource.element("@id", copyAnnoNewAID);
                                        }
                                        //copy canvas list from original canvas list
                                        JSONObject canvasList = CreateAnnoListUtil.createEmptyAnnoList(templateProject.getProjectName(), thisProject.getProjectID(), folio.getPageName(), resources);
                                        URL postUrl = new URL(Constant.ANNOTATION_SERVER_ADDR + "/anno/saveNewAnnotation.action");
                                        HttpURLConnection uc = (HttpURLConnection) postUrl.openConnection();
                                        uc.setDoInput(true);
                                        uc.setDoOutput(true);
                                        uc.setRequestMethod("POST");
                                        uc.setUseCaches(false);
                                        uc.setInstanceFollowRedirects(true);
                                        uc.addRequestProperty("content-type", "application/x-www-form-urlencoded");
                                        uc.connect();
                                        DataOutputStream dataOut = new DataOutputStream(uc.getOutputStream());
                                        dataOut.writeBytes("content=" + URLEncoder.encode(canvasList.toString(), "utf-8"));
                                        dataOut.flush();
                                        dataOut.close();
                                        BufferedReader reader = new BufferedReader(new InputStreamReader(uc.getInputStream(),"utf-8"));
        //                                String line="";
        //                                StringBuilder sb = new StringBuilder();
        //                                System.out.println("=============================");  
        //                                System.out.println("Contents of post request");  
        //                                System.out.println("=============================");  
        //                                while ((line = reader.readLine()) != null){  
        //                                    //line = new String(line.getBytes(), "utf-8");  
        //                                    System.out.println(line);
        //                                    sb.append(line);
        //                                }
        //                                System.out.println("=============================");  
        //                                System.out.println("Contents of post request ends");  
        //                                System.out.println("=============================");  
                                        reader.close();
                                        uc.disconnect();
                                    }
                                }
                            }
                        }
                    }
                } catch(Exception e){
                    e.printStackTrace();
                }
            }
        }else{
            result = response.SC_FORBIDDEN;
        }
        response.getWriter().print(result);
    }
    
    @Override
    protected void doGet(HttpServletRequest request, HttpServletResponse response) throws ServletException, IOException {
        doPost(request, response);
    }
}
