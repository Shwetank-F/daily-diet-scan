import { AuthWrapper } from "@/components/auth/AuthWrapper";
import { DailyDashboard } from "@/components/dashboard/DailyDashboard";

const Index = () => {
  return (
    <AuthWrapper>
      <DailyDashboard />
    </AuthWrapper>
  );
};

export default Index;
