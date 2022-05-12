/*
For full html messages, instead of sanitizing html via html-ssr.tsx, we just put the html in a big iframe.

This makes it so, e.g., plotly plots, which are NOT embedded in an iframe, still just work with our
public nbviewer.

Note that some HTML, e.g., anything embedded in markdown cells, still gets rendered via sanitized html.
*/

import {useEffect} from "react";
import register from "./register";

const IframeHtml = ({ value }) => {
  // after mounting, we measure the content of the iframe and resize to better fit it.
  // This will work fine on the share server, and looks much better.
  useEffect(()=>{
    
  }, []);

  return (
    <iframe
      width="100%"
      height={
        "600px" /* Kind of arbitrary -- but overflow auto below, so scrollable */
      }
      style={{ overflow: "auto", border: 0 }}
      src={value}
      srcDoc={value}
      sandbox="allow-forms allow-scripts allow-same-origin"
    />
  );
};

register("text/html", 5, IframeHtml);
