"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { DataTable, type Column } from "@/components/ui/data-table";
import { MessageSquare, Eye, RefreshCw, Database, FileText, Trash2, Edit } from "lucide-react";
import { useLanguage } from "@/lib/i18n/language-context";
import { format } from "date-fns";
import { Badge } from "@/components/ui/badge";
import Image from "next/image";
import { useToast } from "@/components/ui/use-toast";
import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";

// Define the Channel type
type Channel = {
  id: string;
  name: string;
  type: string;
  chat_pic?: string;
  chat_pic_full?: string;
  created_at: number;
  description_at: number;
  invite_code: string;
  verification: boolean;
  description: string;
  preview?: string;
  role: string;
};

// Add translations
const translations = {
  en: {
    title: "Channels",
    description: "Browse and manage communication channels",
    fetchChannels: "Fetch Channels",
    fetching: "Fetching...",
    getData: "Get Data",
    exportPDF: "Export PDF",
    channelList: "Channel List (Owner Only)",
    showingOnly: "Showing only channels where you are the owner",
    searchPlaceholder: "Search channels...",
    exportFilename: "channels-export",
    columns: {
      id: "ID",
      channel: "Channel",
      type: "Type",
      created: "Created",
      updated: "Updated",
      inviteCode: "Invite Code",
      verification: "Verification",
      role: "Role",
      actions: "Actions"
    },
    status: {
      verified: "Verified",
      notVerified: "Not Verified"
    },
    actions: {
      view: "View Details"
    }
  },
  ar: {
    title: "القنوات",
    description: "تصفح وإدارة قنوات الاتصال",
    fetchChannels: "جلب القنوات",
    fetching: "جاري الجلب...",
    getData: "الحصول على البيانات",
    exportPDF: "تصدير PDF",
    channelList: "قائمة القنوات (المالك فقط)",
    showingOnly: "عرض القنوات التي أنت مالكها فقط",
    searchPlaceholder: "البحث في القنوات...",
    exportFilename: "تصدير-القنوات",
    columns: {
      id: "المعرف",
      channel: "القناة",
      type: "النوع",
      created: "تاريخ الإنشاء",
      updated: "تاريخ التحديث",
      inviteCode: "رمز الدعوة",
      verification: "التحقق",
      role: "الدور",
      actions: "الإجراءات"
    },
    status: {
      verified: "تم التحقق",
      notVerified: "لم يتم التحقق"
    },
    actions: {
      view: "عرض التفاصيل"
    }
  }
};

export default function ChannelsPage() {
  const { language } = useLanguage();
  const router = useRouter();
  const [channels, setChannels] = useState<Channel[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isFetchingChannels, setIsFetchingChannels] = useState(false);
  const [isFetchingMeta, setIsFetchingMeta] = useState(false);
  const { toast } = useToast();
  const t = translations[language as keyof typeof translations];

  // Add useEffect to fetch channels on component mount
  useEffect(() => {
    fetchChannelsFromAPI();
  }, []); // Empty dependency array means this runs once when component mounts

  // Fetch channels from the API
  const fetchChannelsFromAPI = async () => {
    setIsFetchingChannels(true);
    setIsLoading(true);
    console.log('Attempting to fetch channels...');
    try {
      const token = localStorage.getItem("token");
      if (!token) {
        throw new Error("No authentication token found. Please login first.");
      }

      const apiUrl = "http://localhost:5000/api/fetch-channel";
      console.log('Fetching channels from URL:', apiUrl);

      const response = await fetch(apiUrl, {
        method: "GET",
        headers: {
          "Authorization": `Bearer ${token}`,
          "Accept": "application/json"
        }
      });

      console.log('API Response status:', response.status);
      console.log('API Response headers:', Object.fromEntries(response.headers.entries()));

      const responseText = await response.text();
      console.log('Raw response text:', responseText);

      let data;
      try {
        data = JSON.parse(responseText);
        console.log('Parsed response data:', data);
      } catch (parseError) {
        console.error('Error parsing JSON:', parseError);
        throw new Error('Invalid JSON response from server');
      }

      if (!response.ok) {
        throw new Error(data.message || `HTTP error! status: ${response.status}`);
      }

      if (!data || !data.data || !Array.isArray(data.data)) {
        console.error('Invalid API response format:', data);
        throw new Error("Invalid API response format: expected data array");
      }

      // Filter channels to show only those where the user is the owner
      const mappedChannels: Channel[] = data.data
        .filter((item: any) => item.role === 'owner')
        .map((item: any) => ({
          id: item.id || '',
          name: item.name || '',
          type: item.type || '',
          chat_pic: item.chat_pic || '',
          chat_pic_full: item.chat_pic_full || '',
          created_at: item.created_at || 0,
          description_at: item.description_at || 0,
          invite_code: item.invite_code || '',
          verification: item.verification || false,
          description: item.description || '',
          preview: item.preview || '',
          role: item.role || 'subscriber',
        }));

      console.log('Mapped channels (owner only):', mappedChannels);

      setChannels(mappedChannels);
      console.log('Channels state updated.', mappedChannels.length, 'channels');
      
      toast({
        title: "Channels Fetched",
        description: `Successfully fetched ${mappedChannels.length} channels where you are the owner.`,
      });
    } catch (error: unknown) {
      console.error('Error fetching channels:', error);
      const errorMessage = error instanceof Error ? error.message : "Failed to fetch channels. Please try again.";
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
      setIsFetchingChannels(false);
      console.log('Fetch channels process finished.');
    }
  };

  // Fetch metadata from the API
  const fetchMetaData = async () => {
    setIsFetchingMeta(true);
    try {
      const token = localStorage.getItem("token");
      if (!token) {
        throw new Error("You must be logged in to fetch metadata.");
      }
      const response = await fetch("http://localhost:5000/api/meta", {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
          Accept: "application/json",
        },
      });
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Failed to fetch metadata.");
      }
      const data = await response.json();
      console.log("Metadata:", data);
      toast({
        title: "Metadata Fetched",
        description: "Successfully fetched metadata.",
      });
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : "Failed to fetch metadata. Please try again.";
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setIsFetchingMeta(false);
    }
  };

  // Function to format Unix timestamp
  const formatDate = (timestamp: number) => {
    try {
      return format(new Date(timestamp * 1000), "MMM d, yyyy");
    } catch (error) {
      return "Invalid date";
    }
  };

  // Function to navigate to channel details page
  const viewChannelDetails = (channelId: string) => {
    const id = extractId(channelId);
    router.push(`/dashboard/channels/${id}`);
  };

  // Function to extract ID from the newsletter ID
  const extractId = (fullId: string) => {
    const parts = fullId.split("@");
    return parts[0];
  };

  // Update PDF export function with translations
  const exportToPDF = () => {
    const doc = new jsPDF();
    
    // Add title
    doc.setFontSize(16);
    doc.text(t.channelList, 14, 15);
    
    // Add date
    doc.setFontSize(10);
    doc.text(`${t.exportPDF}: ${new Date().toLocaleDateString()}`, 14, 22);

    // Prepare table data
    const tableData = channels.map(channel => [
      extractId(channel.id),
      channel.name,
      channel.type,
      formatDate(channel.created_at),
      formatDate(channel.description_at),
      channel.invite_code,
      channel.verification ? t.status.verified : t.status.notVerified,
      channel.role
    ]);

    // Add table using autoTable
    autoTable(doc, {
      head: [[
        t.columns.id,
        t.columns.channel,
        t.columns.type,
        t.columns.created,
        t.columns.updated,
        t.columns.inviteCode,
        t.columns.verification,
        t.columns.role
      ]],
      body: tableData,
      startY: 30,
      styles: {
        fontSize: 8,
        cellPadding: 2,
      },
      headStyles: {
        fillColor: [41, 128, 185],
        textColor: 255,
        fontSize: 9,
        fontStyle: "bold",
      },
      alternateRowStyles: {
        fillColor: [245, 245, 245],
      },
    });

    // Save the PDF
    doc.save(`${t.exportFilename}.pdf`);
  };

  // Add deleteChannel function before the columns definition
  const deleteChannel = async (channelId: string) => {
    try {
      const token = localStorage.getItem("token")
      if (!token) {
        throw new Error("No authentication token found. Please login first.")
      }

      // Confirm deletion
      if (!window.confirm("Are you sure you want to delete this channel? This action cannot be undone.")) {
        return
      }

      const apiUrl = `http://localhost:5000/api/channels/${channelId}`
      console.log('Deleting channel:', apiUrl)

      const response = await fetch(apiUrl, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Accept': 'application/json'
        }
      })

      const data = await response.json()
      console.log('Delete response:', data)

      if (!response.ok) {
        throw new Error(data.message || `Failed to delete channel: ${response.status}`)
      }

      if (!data.success) {
        throw new Error(data.message || "Failed to delete channel")
      }

      // Remove the deleted channel from the state
      setChannels(prevChannels => prevChannels.filter(channel => channel.id !== channelId))

      toast({
        title: "Success",
        description: "Channel deleted successfully",
      })
    } catch (error) {
      console.error('Error deleting channel:', error)
      const errorMessage = error instanceof Error ? error.message : "Failed to delete channel"
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
      })
    }
  }

  // Define columns for the DataTable
  const columns: Column<Channel>[] = [
    {
      header: t.columns.id,
      accessorKey: "id",
      enableSorting: true,
      cell: (row) => extractId(row.id),
      meta: {
        className: "w-[50px]",
      },
    },
    {
      header: t.columns.channel,
      accessorKey: "name",
      enableSorting: true,
      enableFiltering: true,
      cell: (row) => (
        <div className="flex items-center gap-3">
          {row.chat_pic ? (
            <Image
              src={row.chat_pic || "/placeholder.svg"}
              alt={row.name}
              width={32}
              height={32}
              className="rounded-full"
            />
          ) : (
            <div className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center">
              <MessageSquare className="h-4 w-4 text-gray-500" />
            </div>
          )}
          <div>
            <div className="font-medium">{row.name}</div>
            <div className="text-xs text-muted-foreground truncate max-w-[200px]">{row.description}</div>
          </div>
        </div>
      ),
    },
    {
      header: t.columns.type,
      accessorKey: "type",
      enableSorting: true,
      cell: (row) => (
        <Badge variant="outline" className="capitalize">
          {row.type}
        </Badge>
      ),
    },
    {
      header: t.columns.created,
      accessorKey: "created_at",
      enableSorting: true,
      cell: (row) => formatDate(row.created_at),
      meta: {
        visibleFrom: "md",
      },
    },
    {
      header: t.columns.updated,
      accessorKey: "description_at",
      enableSorting: true,
      cell: (row) => formatDate(row.description_at),
    },
    {
      header: t.columns.inviteCode,
      accessorKey: "invite_code",
      enableSorting: false,
      cell: (row) => <code className="rounded bg-muted px-1 py-0.5 text-xs">{row.invite_code}</code>,
    },
    {
      header: t.columns.verification,
      accessorKey: "verification",
      enableSorting: true,
      cell: (row) => (
        <div className={`flex items-center ${row.verification ? "text-green-500" : "text-gray-500"}`}>
          <span className={`w-2 h-2 rounded-full mr-2 ${row.verification ? "bg-green-500" : "bg-gray-400"}`}></span>
          {row.verification ? t.status.verified : t.status.notVerified}
        </div>
      ),
    },
    {
      header: t.columns.role,
      accessorKey: "role",
      enableSorting: true,
      cell: (row) => <Badge className={row.role === "owner" ? "bg-primary" : "bg-blue-500"}>{row.role}</Badge>,
    },
    {
      header: t.columns.actions,
      accessorKey: "description",
      enableSorting: false,
      cell: (row) => (
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => viewChannelDetails(row.id)}
            className="h-8 w-8"
          >
            <Eye className="h-4 w-4" />
          </Button>
          {row.role === "owner" && (
            <>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => router.push(`/dashboard/channels/edit/${row.id}`)}
                className="h-8 w-8 text-blue-600 hover:text-blue-600 hover:bg-blue-50"
              >
                <Edit className="h-4 w-4" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => deleteChannel(row.id)}
                className="h-8 w-8 text-red-600 hover:text-red-600 hover:bg-red-50"
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </>
          )}
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-col space-y-2 sm:flex-row sm:items-center sm:justify-between sm:space-y-0">
        <div>
          <h1 className="text-2xl font-bold md:text-3xl">{t.title}</h1>
          <p className="text-muted-foreground">{t.description}</p>
        </div>
        <div className="flex flex-col sm:flex-row gap-2">
          <Button variant="outline" onClick={fetchChannelsFromAPI} disabled={isFetchingChannels}>
            {isFetchingChannels ? (
              <>
                <RefreshCw className="mr-2 h-4 w-4 animate-spin" /> {t.fetching}
              </>
            ) : (
              <>
                <RefreshCw className="mr-2 h-4 w-4" /> {t.fetchChannels}
              </>
            )}
          </Button>
          <Button variant="outline" onClick={fetchMetaData} disabled={isFetchingMeta}>
            {isFetchingMeta ? (
              <>
                <Database className="mr-2 h-4 w-4 animate-spin" /> {t.fetching}
              </>
            ) : (
              <>
                <Database className="mr-2 h-4 w-4" /> {t.getData}
              </>
            )}
          </Button>
          <Button variant="outline" onClick={exportToPDF}>
            <FileText className="mr-2 h-4 w-4" /> {t.exportPDF}
          </Button>
        </div>
      </div>
      {isLoading ? (
        <div className="flex items-center justify-center p-12">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
        </div>
      ) : (
        <DataTable
          data={channels}
          columns={columns}
          title={t.channelList}
          description={t.showingOnly}
          searchPlaceholder={t.searchPlaceholder}
          exportFilename={t.exportFilename}
          initialPageSize={10}
          pageSizeOptions={[5, 10, 20]}
          isLoading={isLoading}
          onRefresh={fetchChannelsFromAPI}
        />
      )}
    </div>
  );
}