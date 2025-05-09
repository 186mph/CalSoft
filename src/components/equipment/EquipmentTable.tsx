import React from 'react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/Table';
import { Button } from '@/components/ui/Button';
import { Separator } from '@/components/ui/Separator';
import { Badge } from '@/components/ui/Badge';
import { MoreHorizontal, Edit, Trash, ClipboardCheck } from 'lucide-react';
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem } from '@/components/ui/DropdownMenu';
import { format } from 'date-fns';
import { Equipment } from '@/lib/interfaces/equipment';

interface EquipmentTableProps {
  equipment: any[];
  onEdit: (equipment: any) => void;
  onDelete: (equipment: any) => void;
  onAssign: (equipment: any) => void;
  onViewDetails: (equipment: any) => void;
}

export function EquipmentTable({ equipment, onEdit, onDelete, onAssign, onViewDetails }: EquipmentTableProps) {
  
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'available':
        return 'bg-green-100 text-green-800';
      case 'assigned':
        return 'bg-blue-100 text-blue-800';
      case 'maintenance':
        return 'bg-yellow-100 text-yellow-800';
      case 'retired':
        return 'bg-gray-100 text-gray-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };
  
  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'available':
        return 'Available';
      case 'assigned':
        return 'Assigned';
      case 'maintenance':
        return 'In Maintenance';
      case 'retired':
        return 'Retired';
      default:
        return status;
    }
  };
  
  const formatDate = (dateString: string | null) => {
    if (!dateString) return 'N/A';
    try {
      return format(new Date(dateString), 'MMM dd, yyyy');
    } catch (error) {
      return 'Invalid Date';
    }
  };

  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Name</TableHead>
            <TableHead>Type</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Location</TableHead>
            <TableHead>Customer</TableHead>
            <TableHead>Asset</TableHead>
            <TableHead>Last Maintenance</TableHead>
            <TableHead>Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {equipment.length === 0 ? (
            <TableRow>
              <TableCell colSpan={8} className="text-center py-4">
                No equipment found
              </TableCell>
            </TableRow>
          ) : (
            equipment.map((item) => (
              <TableRow 
                key={item.id}
                className="cursor-pointer hover:bg-gray-50"
                onClick={() => onViewDetails(item)}
              >
                <TableCell className="font-medium">{item.name}</TableCell>
                <TableCell>{item.type}</TableCell>
                <TableCell>
                  <Badge className={getStatusColor(item.status)}>
                    {getStatusLabel(item.status)}
                  </Badge>
                </TableCell>
                <TableCell>{item.location || 'N/A'}</TableCell>
                <TableCell>{item.customer?.name || 'N/A'}</TableCell>
                <TableCell>{item.asset?.name || 'N/A'}</TableCell>
                <TableCell>{formatDate(item.last_maintenance_date)}</TableCell>
                <TableCell onClick={(e) => e.stopPropagation()}>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon">
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent>
                      <DropdownMenuItem onClick={() => onEdit(item)}>
                        <Edit className="mr-2 h-4 w-4" />
                        <span>Edit</span>
                      </DropdownMenuItem>
                      <DropdownMenuItem 
                        onClick={() => onAssign(item)}
                        disabled={item.status !== 'available'}
                      >
                        <ClipboardCheck className="mr-2 h-4 w-4" />
                        <span>Assign</span>
                      </DropdownMenuItem>
                      <Separator />
                      <DropdownMenuItem 
                        onClick={() => onDelete(item)} 
                        className="text-red-600 hover:text-red-700"
                      >
                        <Trash className="mr-2 h-4 w-4" />
                        <span>Delete</span>
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </div>
  );
} 