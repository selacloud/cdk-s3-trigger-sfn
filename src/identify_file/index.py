import boto3
import json

s3 = boto3.resource("s3")


class UnknownFileType(Exception):
    pass


def handler(event):
    print(event)
    s3.meta.client.download_file(event["bucket"], event["key"], f"/tmp/{event['key']}")
    try:
        with open(f"/tmp/{event['key']}") as file:
            data = json.load(file)
            if not "name" in data:
                raise UnknownFileType("Missing attribute 'name'")
            if not "date" in data:
                raise UnknownFileType("Missing attribute 'date'")
            return event
    except UnknownFileType:
        raise
    except:
        raise UnknownFileType("Unable to process file")
