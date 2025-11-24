import { Chip, Box } from '@mui/material';
import FolderIcon from '@mui/icons-material/FolderRounded';
import DescriptionIcon from '@mui/icons-material/DescriptionRounded';
import AllInclusiveIcon from '@mui/icons-material/AllInclusiveRounded';
import { ChatScope } from '../../services/api/types';

interface ScopeSelectorProps {
    scope: ChatScope;
}

export function ScopeSelector({ scope }: ScopeSelectorProps) {
    const getScopeLabel = () => {
        switch (scope.type) {
            case 'doc':
                return scope.ids.length === 1
                    ? 'Single Document'
                    : `${scope.ids.length} Documents`;
            case 'folder':
                return scope.ids.length === 1
                    ? 'Single Folder'
                    : `${scope.ids.length} Folders`;
            case 'all':
                return 'All Materials';
            default:
                return 'Unknown Scope';
        }
    };

    const getScopeIcon = () => {
        switch (scope.type) {
            case 'doc':
                return <DescriptionIcon fontSize="small" />;
            case 'folder':
                return <FolderIcon fontSize="small" />;
            case 'all':
                return <AllInclusiveIcon fontSize="small" />;
            default:
                return null;
        }
    };

    return (
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Chip
                icon={getScopeIcon() || undefined}
                label={getScopeLabel()}
                size="small"
                color="primary"
                variant="outlined"
                sx={{ fontWeight: 600 }}
            />
        </Box>
    );
}
