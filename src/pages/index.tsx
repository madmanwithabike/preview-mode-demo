import S3 from "aws-sdk/clients/s3";
import { NextPage } from "next";
import Head from "next/head";
import { useCallback, useRef, useState } from "react";
import Edit from "../components/edit";
import { ShareLinkDialog } from "../components/home/ShareLinkDialog";
import Malleable, { FieldEdit } from "../components/malleable";
import Snapshot from "../components/snapshot";
import { useScrollReset } from "../hooks/use-scroll-reset";
import layoutStyles from "../styles/layout.module.css";

// Next.js automatically eliminates code used for `getStaticProps`!
// This code (and the `aws-sdk` import) will be absent from the final client-
// side JavaScript bundle(s).
const s3 = new S3({
  credentials: {
    accessKeyId: process.env.AWS_S3_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_S3_SECRET_ACCESS_KEY
  }
});

export async function getStaticProps({
  // `preview` is a Boolean, specifying whether or not the application is in
  // "Preview Mode":
  preview,
  // `previewData` is only set when `preview` is `true`, and contains whatever
  // user-specific data was set in `res.setPreviewData`. See the API endpoint
  // that enters "Preview Mode" for more info (api/share/[snapshotId].tsx).
  previewData
}) {
  if (preview) {
    const { snapshotId } = previewData as { snapshotId: string };
    try {
      // In preview mode, we want to access the stored data from AWS S3.
      // Imagine using this to fetch draft CMS state, etc.
      const object = await s3
        .getObject({
          Bucket: process.env.AWS_S3_BUCKET,
          Key: `${snapshotId}.json`
        })
        .promise();

      const contents = JSON.parse(object.Body.toString());
      return {
        props: { isPreview: true, snapshotId, contents }
      };
    } catch (e) {
      return {
        props: {
          isPreview: false,
          hasError: true,
          message:
            // 403 implies 404 in this case, as our IAM user has access to all
            // objects, but the bucket itself is private.
            e.statusCode === 403
              ? "The requested preview edit does not exist!"
              : "An unknown error has occurred. Please refresh the page or exit Preview Mode."
        }
      };
    }
  }
  return { props: { isPreview: false } };
}

const Home: NextPage<GetProps<typeof getStaticProps>> = props => {
  // Scroll to top on mount as to ensure the user sees the "Preview Mode" bar
  useScrollReset();

  const [currentSnapshotId, setSnapshotId] = useState(null);
  const clearSnapshot = useCallback(() => setSnapshotId(null), [setSnapshotId]);

  const [isEdit, setEdit] = useState(false);
  const toggleEdit = useCallback(() => setEdit(!isEdit), [isEdit]);

  // Prevent duplication before re-render
  const hasSaveRequest = useRef(false);
  const [isSharingView, _setSharing] = useState(false);
  const setSharing = useCallback(
    (sharing: boolean) => {
      hasSaveRequest.current = sharing;
      _setSharing(sharing);
    },
    [hasSaveRequest, _setSharing]
  );
  const share = useCallback(() => {
    if (hasSaveRequest.current) return;
    setSharing(true);

    const els = document.querySelectorAll("[id] > [contenteditable=true]");
    const persistContents: FieldEdit[] = [].slice
      .call(els)
      .map(({ parentNode: { id }, innerText }) => ({ id, innerText }));

    self
      .fetch(`/api/save`, {
        method: "POST",
        body: JSON.stringify(persistContents),
        headers: { "content-type": "application/json" }
      })
      .then(res => {
        // TODO: handle !res.ok
        return res.json();
      })
      .then(({ snapshotId }) => {
        setSnapshotId(snapshotId);
      })
      .finally(() => {
        setSharing(false);
      });
  }, []);

  const edits = props.isPreview ? props.contents : [];
  // TODO: handle `props.message` when `props.hasError`
  return (
    <>
      <Head>
        <title>Next.js | Preview Mode</title>
      </Head>
      {currentSnapshotId && (
        <ShareLinkDialog
          snapshotId={currentSnapshotId}
          onExit={clearSnapshot}
        />
      )}
      <div className={layoutStyles.layout}>
        {(props.isPreview || props.hasError) && (
          <aside role="alert">
            <a href="/api/exit">Preview Mode</a>
          </aside>
        )}
        <Malleable id="title" as="h1" isActive={isEdit} edits={edits}>
          My Static Site
        </Malleable>

        <div className="features">
          <div className="feature">
            <Malleable
              id="feature-1-emoji"
              as="div"
              isActive={isEdit}
              edits={edits}
            >
              ⚡
            </Malleable>
            <Malleable
              id="feature-1-text"
              as="h4"
              isActive={isEdit}
              edits={edits}
            >
              Blazing fast
            </Malleable>
          </div>
          <div className="feature">
            <Malleable
              id="feature-2-emoji"
              as="div"
              isActive={isEdit}
              edits={edits}
            >
              📡
            </Malleable>
            <Malleable
              id="feature-2-text"
              as="h4"
              isActive={isEdit}
              edits={edits}
            >
              Always available
            </Malleable>
          </div>
          <div className="feature">
            <Malleable
              id="feature-3-emoji"
              as="div"
              isActive={isEdit}
              edits={edits}
            >
              🏎
            </Malleable>
            <Malleable
              id="feature-3-text"
              as="h4"
              isActive={isEdit}
              edits={edits}
            >
              Lighthouse 100
            </Malleable>
          </div>
        </div>

        <Malleable as="h2" id="title-2" isActive={isEdit} edits={edits}>
          This demonstrates a static website generated using{" "}
          <a target="_blank" rel="noopener" href="https://nextjs.org">
            Next.js'
          </a>{" "}
          new{" "}
          <a
            target="_blank"
            rel="noopener"
            href="https://github.com/zeit/next.js/issues/9524"
          >
            Static Site Generation (SSG)
          </a>
          .
        </Malleable>

        <div className="explanation">
          <div className="p">
            <Malleable
              id="explanation-1-inspect"
              as="span"
              isActive={isEdit}
              edits={edits}
            >
              To inspect the response from{" "}
              <a
                target="_blank"
                rel="noopener"
                href="https://zeit.co/smart-cdn"
              >
                our edge network
              </a>
              , run:
            </Malleable>
            <br />
            <Malleable
              id="explanation-1-pre-curl"
              as="pre"
              isActive={isEdit}
              edits={edits}
            >
              curl -sI https://preview.ssg.how | grep x-now
            </Malleable>
            <Malleable
              id="explanation-1-pre-response"
              as="pre"
              className="light"
              isActive={isEdit}
              edits={edits}
            >
              x-now-cache: HIT
              <br />
              x-now-trace: sfo1
              <br />
              x-now-id: sfo1:7c7lc-1583269874370-6a496f5a4e91
            </Malleable>
          </div>
          <Malleable id="explanation-2" isActive={isEdit} edits={edits}>
            When people visit this site, the response always comes instantly
            from their{" "}
            <a target="_blank" rel="noopener" href="https://zeit.co/smart-cdn">
              nearest location
            </a>
            .
          </Malleable>
          <Malleable id="explanation-3" isActive={isEdit} edits={edits}>
            Unlike traditional static solutions, however, you can generate
            previews of edits that you can share with anyone you choose.
          </Malleable>
          <Malleable id="explanation-4" isActive={isEdit} edits={edits}>
            This makes Next.js the most optimal framework to integrate into your
            Headless CMS workflow.
          </Malleable>
        </div>
      </div>
      {isEdit ? (
        <>
          <Snapshot
            onCancel={toggleEdit}
            onShare={share}
            isSharing={isSharingView}
          />
        </>
      ) : (
        <Edit onClick={toggleEdit} />
      )}
    </>
  );
};

export default Home;