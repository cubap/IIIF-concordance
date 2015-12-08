/*
 * To change this license header, choose License Headers in Project Properties.
 * To change this template file, choose Tools | Templates
 * and open the template in the editor.
 */
package edu.slu.tpen.servlet;

import edu.slu.tpen.servlet.util.EncryptUtil;
import java.io.IOException;
import java.net.URLDecoder;
import java.sql.Connection;
import java.sql.PreparedStatement;
import java.sql.ResultSet;
import java.sql.Statement;
import java.util.HashMap;
import java.util.Map;
import java.util.logging.Level;
import java.util.logging.Logger;
import javax.servlet.ServletException;
import javax.servlet.annotation.WebServlet;
import javax.servlet.http.HttpServlet;
import javax.servlet.http.HttpServletRequest;
import javax.servlet.http.HttpServletResponse;
import javax.servlet.http.HttpSession;
import textdisplay.DatabaseWrapper;

/**
 *
 * @author hanyan
 */
@WebServlet(name = "LoginHookServlet", urlPatterns = {"/loginHook"})
public class LoginHookServlet extends HttpServlet {

    /**
     * Processes requests for both HTTP <code>GET</code> and <code>POST</code>
     * methods.
     *
     * @param request servlet request
     * @param response servlet response
     * @throws ServletException if a servlet-specific error occurs
     * @throws IOException if an I/O error occurs
     */
    protected void processRequest(HttpServletRequest request, HttpServletResponse response)
            throws ServletException, IOException {
        String text = request.getQueryString();
        EncryptUtil mcrypt = new EncryptUtil();
        try {
            String decrypted = URLDecoder.decode(new String( mcrypt.decrypt( text ) ), "UTF-8");
            String[] params = decrypted.split("&");
            Map<String, Object> vals = new HashMap();
            for(int i = 0; i < params.length; i++){
                String param = params[i];
                if(param.contains("=")){
                    String[] nameVal = param.split("=");
                    if(nameVal.length == 2){
                        String prop = nameVal[0];
                        String val = nameVal[1];
                        vals.put(prop, val);
                    }
                }
            }
            String query = "select * from users where email = ?";
            Connection j = null;
            PreparedStatement ps=null;
            j = DatabaseWrapper.getConnection();
            ps = j.prepareStatement(query);
            ps.setString(1, vals.get("email") + "");
            ResultSet rs = ps.executeQuery();
            int uid = 0;
            while(rs.next()){
                uid = rs.getInt("id");
            }
            DatabaseWrapper.closeDBConnection(j);
            DatabaseWrapper.closePreparedStatement(ps);
            if(uid != 0){
                HttpSession session = request.getSession();
                session.setAttribute("UID", uid);
                session.setAttribute("role", vals.get("role"));
            }else{
                String insertUser = "insert into users (uname, email) values (?,?)";
                j = DatabaseWrapper.getConnection();
                ps = j.prepareStatement(insertUser, Statement.RETURN_GENERATED_KEYS);
                ps.setString(1, vals.get("username") + "");
                ps.setString(2, vals.get("email") + "");
                ps.executeUpdate();
                ResultSet gk = ps.getGeneratedKeys();
                int newUID = -1;
                if(gk.next()){
                    newUID = gk.getInt(1);
                    HttpSession session = request.getSession();
                    session.setAttribute("UID", newUID);
                }
            }
            response.sendRedirect((String)vals.get("redirect_uri"));
        } catch (Exception ex) {
            Logger.getLogger(LoginHookServlet.class.getName()).log(Level.SEVERE, null, ex);
        }
    }

    // <editor-fold defaultstate="collapsed" desc="HttpServlet methods. Click on the + sign on the left to edit the code.">
    /**
     * Handles the HTTP <code>GET</code> method.
     *
     * @param request servlet request
     * @param response servlet response
     * @throws ServletException if a servlet-specific error occurs
     * @throws IOException if an I/O error occurs
     */
    @Override
    protected void doGet(HttpServletRequest request, HttpServletResponse response)
            throws ServletException, IOException {
        processRequest(request, response);
    }

    /**
     * Handles the HTTP <code>POST</code> method.
     *
     * @param request servlet request
     * @param response servlet response
     * @throws ServletException if a servlet-specific error occurs
     * @throws IOException if an I/O error occurs
     */
    @Override
    protected void doPost(HttpServletRequest request, HttpServletResponse response)
            throws ServletException, IOException {
        processRequest(request, response);
    }

    /**
     * Returns a short description of the servlet.
     *
     * @return a String containing servlet description
     */
    @Override
    public String getServletInfo() {
        return "Short description";
    }// </editor-fold>

}
