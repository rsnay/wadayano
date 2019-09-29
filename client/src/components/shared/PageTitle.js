import { useEffect} from 'react';

/**
 * Used to set the page (document) title
 */
const PageTitle = ({ title }) => {
  useEffect(() => {
    const previousTitle = document.title;
    // When this is muonted, set the document title
    document.title = title;
    // When this is unmounted, reset to the previous title
    return () => document.title = previousTitle;
  }, [title]);

  return null;
}

export default PageTitle;
