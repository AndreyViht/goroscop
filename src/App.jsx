import Toaster from "./components/Helpers/Toaster";
import Routers from "./Routers";
import Default from "./components/Partials/Default";

function App() {
  return (
      <Default>
          <>
              <Routers />
              <Toaster />
          </>
      </Default>
  );
}

export default App;
