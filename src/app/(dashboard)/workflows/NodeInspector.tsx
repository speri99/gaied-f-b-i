import {
    
    Select,
    SelectTrigger,
    SelectValue,
    SelectContent,
    SelectItem,
   
  } from "@/components/ui/select"; // adjust your imports based on how you're exporting
  import { useEffect, useState } from "react";
  import {
    Card, CardContent, CardDescription, CardHeader, CardTitle
  } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
  export const NodeInspector = ({ node, onUpdate }) => {
    if (!node) return null;
  
    const [data, setData] = useState(node.data);
  
    useEffect(() => {
      setData(node.data);
    }, [node]);
  
    const update = (key: string, value: any) => {
      const updated = { ...data, [key]: value };
      setData(updated);
      onUpdate(node.id, updated);
    };
  
    const updateContactInfo = (field: string, value: string) => {
      const updated = {
        ...data,
        contactInfo: {
          ...data.contactInfo,
          [field]: value,
        },
      };
      setData(updated);
      onUpdate(node.id, updated);
    };
  
    return (
        <Card className="w-full h-full bg-background border shadow-md">
        <CardHeader>
          <CardTitle className="text-lg">Edit</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-1">
            <Label>Action Type</Label>
            <Select
              value={data.nodeType}
              onValueChange={(val) => {
                let updated: any = {
                  nodeType: val,
                  title: val[0].toUpperCase() + val.slice(1),
                };
  
                if (val === "wait") {
                  updated = { ...updated, duration: "1", unit: "minutes" };
                } else if (val === "contact") {
                  updated = {
                    ...updated,
                    contactMethod: "",
                    contactType: "",
                    contactInfo: { phone: "", email: "", template: "" },
                  };
                }
  
                setData(updated);
                onUpdate(node.id, updated);
              }}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select node type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="start">Start</SelectItem>
                <SelectItem value="contact">Contact</SelectItem>
                <SelectItem value="wait">Wait</SelectItem>
                <SelectItem value="ack">Acknowledgement</SelectItem>
                <SelectItem value="stop">Stop</SelectItem>
              </SelectContent>
            </Select>
          </div>
  
          {data.nodeType === "contact" && (
            <>
             
  
              <div className="space-y-1">
                <Label>Contact Type</Label>
                <Select
                  value={data.contactType || ""}
                  onValueChange={(val) => update("contactType", val)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select contact type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="primary">Primary</SelectItem>
                    <SelectItem value="secondary">Secondary</SelectItem>
                    <SelectItem value="thirdParty">Third Party</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1">
                <Label>Channel</Label>
                <Select
                  value={data.contactMethod || ""}
                  onValueChange={(val) => update("contactMethod", val)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select contact method" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="phone">Phone</SelectItem>
                    <SelectItem value="email">Email</SelectItem>
                    <SelectItem value="sms">SMS</SelectItem>
                  </SelectContent>
                </Select>
              </div>
  
              {data.contactType === "thirdParty" && (
                <>
                  <div className="space-y-1">
                    <Label>Email</Label>
                    <Input
                      value={data.contactInfo?.email || ""}
                      onChange={(e) => updateContactInfo("email", e.target.value)}
                    />
                  </div>
                  <div className="space-y-1">
                    <Label>Phone</Label>
                    <Input
                      value={data.contactInfo?.phone || ""}
                      onChange={(e) => updateContactInfo("phone", e.target.value)}
                    />
                  </div>
                  <div className="space-y-1">
                    <Label>Message Template</Label>
                    <Input
                      value={data.contactInfo?.template || ""}
                      onChange={(e) => updateContactInfo("template", e.target.value)}
                    />
                  </div>
                </>
              )}
            </>
          )}
  
          {data.nodeType === "wait" && (
            <>
              <div className="space-y-1">
                <Label>Duration</Label>
                <Select
                  value={data.duration || ""}
                  onValueChange={(val) => update("duration", val)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select duration" />
                  </SelectTrigger>
                  <SelectContent>
                    {Array.from({ length: 10 }, (_, i) => (
                      <SelectItem key={i} value={(i + 1).toString()}>
                        {i + 1}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
  
              <div className="space-y-1">
                <Label>Unit</Label>
                <Select
                  value={data.unit || ""}
                  onValueChange={(val) => update("unit", val)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select unit" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="seconds">Seconds</SelectItem>
                    <SelectItem value="minutes">Minutes</SelectItem>
                    <SelectItem value="hours">Hours</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </>
          )}
        </CardContent>
      </Card>
    );
  };