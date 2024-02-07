/*
 *  This file is part of CoCalc: Copyright © 2022 Sagemath, Inc.
 *  License: AGPLv3 s.t. "Commons Clause" – see LICENSE.md for details
 */

import { Layout } from "antd";

import Content from "components/landing/content";
import Footer from "components/landing/footer";
import Head from "components/landing/head";
import Header from "components/landing/header";
import Info from "components/landing/info";
import Pitch from "components/landing/pitch";
import SignIn from "components/landing/sign-in";
import Snapshots from "components/landing/snapshots";
import { Paragraph, Title } from "components/misc";
import A from "components/misc/A";
import { Customize } from "lib/customize";
import withCustomize from "lib/with-customize";
import octaveJupyter from "public/features/cocalc-octave-jupyter-20200511.png";
import octaveTerminal from "public/features/cocalc-octave-terminal-20200511.png";
import octaveX11 from "public/features/cocalc-octave-x11-20200511.png";
import logo from "public/features/octave-logo.svg";
import x11Terminal from "public/features/octave-x11-terminal.png";

const octave = <A href="https://www.gnu.org/software/octave/index">Octave</A>;
const title = "Run Octave Online";

export default function Octave({ customize }) {
  return (
    <Customize value={customize}>
      <Head title={title} />
      <Layout>
        <Header page="features" subPage="octave" runnableTag="octave" />
        <Layout.Content>
          <Content
            landing
            startup={"Octave"}
            logo={logo}
            title={title}
            subtitle={
              <>
                Run {octave} in an online Terminal, a Jupyter Notebook or an X11
                desktop. Octave is largely compatible with MATLAB®! For many
                teaching purposes you can use Octave instead of MATLAB.
              </>
            }
            subtitleBelow={true}
            image={octaveJupyter}
            alt="Plotting a Sombrero in a Jupyter notebook using Octave"
          />

          <Pitch
            col1={
              <>
                <Title level={2}>Run Octave on CoCalc</Title>
                <Paragraph>
                  <ul>
                    <li>
                      Via CoCalc's own real-time synchronized{" "}
                      <strong>
                        <A href="/features/jupyter-notebook">
                          Jupyter Notebooks
                        </A>
                      </strong>
                      .
                    </li>
                    <li>
                      A full, collaborative, real-time synchronized{" "}
                      <strong>
                        <A href="/features/terminal">Linux Terminal</A>
                      </strong>
                      .
                    </li>
                    <li>
                      A{" "}
                      <strong>
                        <A href="/features/x11">
                          virtual X11 graphical Linux desktop
                        </A>
                      </strong>
                      .
                    </li>
                  </ul>
                </Paragraph>

                <Title level={2}>Packages</Title>
                <Paragraph>
                  Browse a{" "}
                  <A href="/software/octave">
                    list of all installed Octave packages...
                  </A>
                </Paragraph>
              </>
            }
            col2={
              <>
                <Title level={3}>Benefits of working online</Title>
                <Paragraph>
                  <ul>
                    <li>
                      You no longer have to{" "}
                      <strong>install and maintain</strong> Octave. In
                      particular when you're{" "}
                      <A href="/features/teaching">teaching a class</A>,
                      students just have to sign in to CoCalc to get started!
                    </li>
                    <li>
                      All your files are private, stored persistently,
                      snapshotted and backed up.
                    </li>
                    <li>
                      You can invite <strong>collaborators</strong> to your
                      project to simultaneously edit the same files.
                    </li>
                    <li>
                      Everything runs remotely, which means you do not have to
                      worry about messing up your own computer.{" "}
                    </li>
                  </ul>
                </Paragraph>
              </>
            }
          />

          <SignIn startup="Octave" />

          <Info.Heading
            description={
              <>There are many ways to use Octave online via CoCalc.</>
            }
          >
            Feature Overview
          </Info.Heading>

          <Info
            title="Jupyter Notebook support"
            icon="ipynb"
            image={octaveJupyter}
            anchor="a-jupyter"
            alt="Using Octave in a Jupyter notebook"
          >
            <Paragraph>
              CoCalc offers its own Jupyter Notebook implementation. It has a
              few key advantages.
            </Paragraph>
            <Paragraph>
              <ol>
                <li>
                  <strong>Realtime synchronization</strong>: two or more
                  collaborators can edit the same notebook at the same time.
                  Everyone sees what others are typing.
                </li>
                <li>
                  <strong>Remote session</strong>: the notebook's kernel runs
                  remotely. This means you only need a web browser and Internet
                  access. Don't worry about software setup.
                </li>
                <li>
                  If you depend on using the classical Jupyter notebook or
                  JupyterLab, it is also very easy to{" "}
                  <A href="https://doc.cocalc.com/jupyter.html#alternatives-plain-jupyter-server-and-jupyterlab-server">
                    use Octave via these services as well
                  </A>
                  .
                </li>
              </ol>
            </Paragraph>
          </Info>

          <Info
            title="Octave in a Terminal"
            icon="octave"
            image={octaveTerminal}
            anchor="a-terminal"
            alt="Using Octave in a CoCalc terminal"
            caption="Octave in CoCalc's Terminal"
          >
            <Paragraph>
              You can edit Octave code and run it in a Terminal as{" "}
              <A href="https://doc.cocalc.com/frame-editor.html">
                explained here
              </A>
              .
            </Paragraph>
            <Paragraph>
              File changes are tracked in detail via{" "}
              <A href="https://doc.cocalc.com/time-travel.html">TimeTravel</A>:
              this means you can see the progress of your changes or see exactly
              what collaborators and students did when you weren't looking.
            </Paragraph>
          </Info>

          <Info
            title="Octave in an X11 Graphical Desktop"
            icon="window-restore"
            image={octaveX11}
            anchor="a-x11"
            alt="Using the traditional Octave GUI via X11"
            wide
          >
            <Paragraph>
              You can start Octave's GUI in a full remote desktop as{" "}
              <A href="https://doc.cocalc.com/x11.html">explained here</A>.
            </Paragraph>
            <Paragraph>
              Accessing a full GUI app remotely adds latency, but you're freed
              from the limitations of a Terminal or Jupyter Notebook. Multiple
              people can interact with the graphical Octave app from different
              web browsers, though you're limited to one mouse cursor.
            </Paragraph>
          </Info>

          <Info
            title="Octave in an X11 Terminal"
            icon="terminal"
            image={x11Terminal}
            anchor="a-x11-terminal"
            caption="X11 Terminal with interactive 3D plot"
            alt="Using a Terminal with Octave and X11 to draw an interactive 3D plot"
            wide
          >
            <Paragraph>
              Run any graphical applications written for Octave in your web
              browser!
            </Paragraph>
            <Paragraph>
              You can start Octave in the X11 graphical terminal. When you plot
              graphics they will appear in a window to the right. In the example
              in the screenshot, it is possible to grab and rotate the 3D plot.
            </Paragraph>
          </Info>

          <Snapshots />

          <SignIn startup="Octave" />
        </Layout.Content>
        <Footer />
      </Layout>
    </Customize>
  );
}

export async function getServerSideProps(context) {
  return await withCustomize({ context });
}
