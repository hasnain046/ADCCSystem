import { BrowserRouter } from 'react-router-dom';
import { SystemProvider } from './contexts/SystemContext';
import AppRoutes from './routes/AppRoutes';

function App() {
  return (
    <SystemProvider>
      <BrowserRouter>
        <AppRoutes />
      </BrowserRouter>
    </SystemProvider>
  );
}

export default App;
