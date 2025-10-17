import { AppShell } from '@/components/dashboard/AppShell';
import { Helmet } from 'react-helmet';

const Index = () => {
  return (
    <>
      <Helmet>
        <title>Türkiye Risk Haritası | Turkey Risk Map Dashboard</title>
        <meta 
          name="description" 
          content="Professional seismic risk analysis dashboard for Turkey neighborhoods. Interactive choropleth, heatmap, and scatter visualizations with VS30 and population data." 
        />
      </Helmet>
      <AppShell />
    </>
  );
};

export default Index;
