import * as React from 'react';
import TreeView from '@mui/lab/TreeView';
import TreeItem from '@mui/lab/TreeItem';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import ChevronRightIcon from '@mui/icons-material/ChevronRight';

function RecursiveTreeView({ nodes, onSelectCategory }) {
    if (!nodes) return null;

    return nodes.map((node) => (
        <TreeItem
            key={node.id}
            nodeId={node.id.toString()}
            label={node.name}
            onLabelClick={() => onSelectCategory(node.name)}
        >
            {node.children && node.children.length > 0 && (
                <RecursiveTreeView nodes={node.children} onSelectCategory={onSelectCategory} />
            )}
        </TreeItem>
    ));
}
