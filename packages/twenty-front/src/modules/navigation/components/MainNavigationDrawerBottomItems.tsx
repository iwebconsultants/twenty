import { NavigationDrawerItem } from '@/ui/navigation/navigation-drawer/components/NavigationDrawerItem';
import { isNavigationDrawerExpandedState } from '@/ui/navigation/states/isNavigationDrawerExpanded';
import { navigationDrawerExpandedMemorizedState } from '@/ui/navigation/states/navigationDrawerExpandedMemorizedState';
import { navigationMemorizedUrlState } from '@/ui/navigation/states/navigationMemorizedUrlState';
import { useLingui } from '@lingui/react/macro';
import { useLocation, useNavigate } from 'react-router-dom';
import { useRecoilState, useSetRecoilState } from 'recoil';
import { SettingsPath } from 'twenty-shared/types';
import { getSettingsPath } from 'twenty-shared/utils';
import { IconSettings } from 'twenty-ui/display';
import { useIsMobile } from 'twenty-ui/utilities';

export const MainNavigationDrawerBottomItems = () => {
  const isMobile = useIsMobile();
  const location = useLocation();
  const setNavigationMemorizedUrl = useSetRecoilState(
    navigationMemorizedUrlState,
  );

  const [isNavigationDrawerExpanded, setIsNavigationDrawerExpanded] =
    useRecoilState(isNavigationDrawerExpandedState);
  const setNavigationDrawerExpandedMemorized = useSetRecoilState(
    navigationDrawerExpandedMemorizedState,
  );

  const navigate = useNavigate();

  const { t } = useLingui();

  return (
    !isMobile && (
      <NavigationDrawerItem
        label={t`Settings`}
        to={getSettingsPath(SettingsPath.ProfilePage)}
        onClick={() => {
          setNavigationDrawerExpandedMemorized(isNavigationDrawerExpanded);
          setIsNavigationDrawerExpanded(true);
          setNavigationMemorizedUrl(location.pathname + location.search);
          navigate(getSettingsPath(SettingsPath.ProfilePage));
        }}
        Icon={IconSettings}
      />
    )
  );
};
